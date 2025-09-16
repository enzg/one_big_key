import { Semaphore } from 'async-mutex';
import { isString } from 'lodash';

import { ensureSensitiveTextEncoded } from '@onekeyhq/core/src/secret';
import {
  backgroundMethod,
  toastIfError,
} from '@onekeyhq/shared/src/background/backgroundDecorators';
import type { OneKeyError } from '@onekeyhq/shared/src/errors';
import {
  OneKeyLocalError,
  PrimeLoginDialogCancelError,
} from '@onekeyhq/shared/src/errors';
import {
  EAppEventBusNames,
  appEventBus,
} from '@onekeyhq/shared/src/eventBus/appEventBus';
import { appLocale } from '@onekeyhq/shared/src/locale/appLocale';
import { ETranslations } from '@onekeyhq/shared/src/locale/enum/translations';
import stringUtils from '@onekeyhq/shared/src/utils/stringUtils';
import timerUtils from '@onekeyhq/shared/src/utils/timerUtils';
import type { IApiClientResponse } from '@onekeyhq/shared/types/endpoint';
import { EServiceEndpointEnum } from '@onekeyhq/shared/types/endpoint';
import type {
  IPrimeDeviceInfo,
  IPrimeServerUserInfo,
  IPrimeSubscriptionInfo,
  IPrimeUserInfo,
} from '@onekeyhq/shared/types/prime/primeTypes';

import {
  primeLoginDialogAtom,
  primePersistAtom,
} from '../../states/jotai/atoms/prime';
import ServiceBase from '../ServiceBase';

import type {
  IPrimeLoginDialogAtomData,
  IPrimeLoginDialogKeys,
  IPrimePersistAtomData,
} from '../../states/jotai/atoms/prime';

class ServicePrime extends ServiceBase {
  constructor({ backgroundApi }: { backgroundApi: any }) {
    super({ backgroundApi });
  }

  async getPrimeClient() {
    return this.getOneKeyIdClient(EServiceEndpointEnum.Prime);
  }

  @backgroundMethod()
  async apiDeleteAccount({
    uuid,
    emailOTP,
  }: {
    uuid: string;
    emailOTP: string;
  }) {
    const client = await this.getOneKeyIdClient(EServiceEndpointEnum.Prime);
    const result = await client.post<IApiClientResponse<{ ok: boolean }>>(
      '/prime/v1/user/delete',
      {
        uuid,
        emailOTP,
      },
    );
    return result?.data?.data;
  }

  loginMutex = new Semaphore(1);

  @backgroundMethod()
  async apiLogin({ accessToken }: { accessToken: string }) {
    await this.loginMutex.runExclusive(async () => {
      if (!accessToken) {
        return;
      }
      // clear simpleDb authToken first, use custom header instead
      await this.backgroundApi.simpleDb.prime.saveAuthToken('');
      const client = await this.getPrimeClient();
      try {
        const response = await client.post<{
          data: {
            userId: string;
            inviteCode: string;
            emails: string[];
            createdAt: string;
          };
        }>(
          '/prime/v1/user/login',
          {},
          {
            headers: {
              'X-Onekey-Request-Token': `${accessToken}`,
            },
          },
        );
        // only save authToken if api login success
        await this.backgroundApi.simpleDb.prime.saveAuthToken(accessToken);
        if (response.data.data.inviteCode) {
          await this.backgroundApi.serviceReferralCode.updateMyReferralCode(
            response.data.data.inviteCode,
          );
        }
        await primePersistAtom.set(
          (v): IPrimePersistAtomData => ({
            ...v,
            displayEmail: response?.data?.data?.emails?.[0],
            isLoggedInOnServer: true,
          }),
        );
      } catch (error) {
        await this.backgroundApi.simpleDb.prime.saveAuthToken('');
        throw error;
      }
    });
  }

  @backgroundMethod()
  async apiLogout() {
    const authToken = await this.backgroundApi.simpleDb.prime.getAuthToken();
    if (!authToken) {
      await this.setPrimePersistAtomNotLoggedIn();
      return;
    }
    const client = await this.getPrimeClient();
    try {
      await client.post('/prime/v1/user/logout');
    } catch (e) {
      console.error(e);
      const error = e as OneKeyError | undefined;
      if (error && error?.key === 'id.login_expired_description') {
        error.autoToast = false;
      }
      throw e;
    }
    await this.setPrimePersistAtomNotLoggedIn();
  }

  @backgroundMethod()
  async apiLogoutPrimeUserDevice({
    instanceId,
    accessToken,
  }: {
    instanceId: string;
    accessToken: string;
  }) {
    // eslint-disable-next-line no-param-reassign
    accessToken =
      accessToken || (await this.backgroundApi.simpleDb.prime.getAuthToken());
    const client = await this.getPrimeClient();
    // TODO 404 not found
    await client.post(
      `/prime/v1/user/device/${instanceId}`,
      {},
      {
        headers: {
          'X-Onekey-Request-Token': `${accessToken}`,
        },
      },
    );
    if (instanceId) {
      await this.apiLogin({ accessToken });
    }
  }

  @backgroundMethod()
  async apiGetPrimeUserDevices({ accessToken }: { accessToken?: string } = {}) {
    const client = await this.getPrimeClient();
    // eslint-disable-next-line no-param-reassign
    accessToken =
      accessToken || (await this.backgroundApi.simpleDb.prime.getAuthToken());
    const result = await client.get<IApiClientResponse<IPrimeDeviceInfo[]>>(
      '/prime/v1/user/devices',
      {
        headers: {
          'X-Onekey-Request-Token': `${accessToken}`,
        },
      },
    );
    const devices = result?.data?.data;
    return devices;
  }

  @backgroundMethod()
  async callApiFetchPrimeUserInfo() {
    const client = await this.getPrimeClient();
    const result = await client.get<IApiClientResponse<IPrimeServerUserInfo>>(
      '/prime/v1/user/info',
    );
    const serverUserInfo = result?.data?.data;
    return serverUserInfo;
  }

  @backgroundMethod()
  async apiFetchServerRandomIdInfo() {
    const client = await this.getPrimeClient();
    const result = await client.get<IApiClientResponse<{ uuid: string }>>(
      '/prime/v1/general/get-random-id',
    );
    const randomId = result?.data?.data;
    return randomId;
  }

  @backgroundMethod()
  async apiFetchPrimeUserInfo(): Promise<{
    userInfo: IPrimeUserInfo;
    serverUserInfo: IPrimeServerUserInfo | undefined;
    primeSubscription: IPrimeSubscriptionInfo | undefined;
  }> {
    console.log('call servicePrime.apiFetchPrimeUserInfo');
    await this.loginMutex.waitForUnlock();
    const authToken = await this.backgroundApi.simpleDb.prime.getAuthToken();
    if (!authToken) {
      await this.setPrimePersistAtomNotLoggedIn();
      const localUserInfo = await primePersistAtom.get();

      // clear privy login token cache
      appEventBus.emit(EAppEventBusNames.PrimeLoginInvalidToken, undefined);

      return {
        userInfo: localUserInfo,
        serverUserInfo: undefined,
        primeSubscription: undefined,
      };
    }
    const serverUserInfo = await this.callApiFetchPrimeUserInfo();
    let primeSubscription: IPrimeSubscriptionInfo | undefined;
    void this.backgroundApi.servicePrimeCloudSync.showAlertDialogIfServerPasswordNotSet(
      {
        serverUserInfo,
      },
    );
    void this.backgroundApi.servicePrimeCloudSync.showAlertDialogIfServerPasswordChanged(
      {
        serverUserInfo,
      },
    );
    if (serverUserInfo.isPrime) {
      primeSubscription = {
        isActive: true,
        expiresAt: serverUserInfo.primeExpiredAt,
        willRenew: serverUserInfo.willRenew,
        subscriptions: serverUserInfo.subscriptions,
      };
    } else {
      primeSubscription = undefined;
    }

    if (serverUserInfo?.inviteCode) {
      await this.backgroundApi.serviceReferralCode.updateMyReferralCode(
        serverUserInfo.inviteCode,
      );
    }
    await primePersistAtom.set(
      (v): IPrimePersistAtomData => ({
        ...v,
        displayEmail: serverUserInfo?.emails?.[0] || v?.displayEmail,
        isEnablePrime: serverUserInfo?.isEnablePrime,
        isEnableSandboxPay: serverUserInfo?.isEnableSandboxPay,
        isLoggedIn: true,
        isLoggedInOnServer: true,
        primeSubscription,
        // salt: serverUserInfo.salt,
        // pwdHash: serverUserInfo.pwdHash,
      }),
    );
    const localUserInfo = await primePersistAtom.get();
    return {
      userInfo: localUserInfo,
      serverUserInfo,
      primeSubscription,
    };
  }

  @backgroundMethod()
  async setPrimePersistAtomNotLoggedIn() {
    console.log('servicePrime.setPrimePersistAtomNotLoggedIn');
    await primePersistAtom.set(
      (): IPrimePersistAtomData => ({
        isLoggedIn: false,
        isLoggedInOnServer: false,
        isEnablePrime: undefined,
        isEnableSandboxPay: undefined,
        privyUserId: undefined,
        email: undefined,
        displayEmail: undefined,
        primeSubscription: undefined,
        subscriptionManageUrl: undefined,
        // salt: undefined,
        // pwdHash: undefined,
      }),
    );
    await this.backgroundApi.serviceMasterPassword.clearLocalMasterPassword();
  }

  @backgroundMethod()
  async isLoggedIn() {
    const { isLoggedIn, isLoggedInOnServer } = await primePersistAtom.get();
    const authToken = await this.backgroundApi.simpleDb.prime.getAuthToken();
    return Boolean(isLoggedIn && isLoggedInOnServer && authToken);
  }

  @backgroundMethod()
  async isPrimeSubscriptionActive() {
    if (!(await this.isLoggedIn())) {
      return false;
    }
    const { primeSubscription } = await primePersistAtom.get();
    return Boolean(primeSubscription?.isActive);
  }

  @backgroundMethod()
  async apiPreparePrimeLogin(_props: { email: string }): Promise<{
    isRegistered: boolean;
    verifyUUID: string;
    captchaRequired: boolean;
    emailCodeRequired: boolean;
  }> {
    // await timerUtils.wait(600);
    // try {
    //   const client = await this.getClient(EServiceEndpointEnum.Prime);
    //   const result = await client.get<
    //     IApiClientResponse<{
    //       isRegistered: boolean;
    //       verifyUUID: string;
    //       captchaRequired: boolean;
    //       emailCodeRequired: boolean;
    //     }>
    //   >('/api/prime/check-email-registered', {
    //     params: {
    //       email,
    //     },
    //   });
    //   return result?.data?.data;
    // } catch (error) {
    //   console.error(error);
    // }

    // if (email.startsWith('1')) {
    //   return {
    //     isRegistered: true,
    //     verifyUUID: stringUtils.generateUUID(),
    //     captchaRequired: false,
    //     emailCodeRequired: false,
    //   };
    // }

    // return {
    //   isRegistered: false,
    //   verifyUUID: stringUtils.generateUUID(),
    //   captchaRequired: true,
    //   emailCodeRequired: true,
    // };

    throw new OneKeyLocalError('Deprecated, use Privy instead');
  }

  @backgroundMethod()
  async apiSendEmailVerificationCode({
    email,
    verifyUUID,
  }: {
    email: string;
    verifyUUID: string;
  }): Promise<{ success: boolean }> {
    await timerUtils.wait(600);
    try {
      const client = await this.getClient(EServiceEndpointEnum.Prime);
      const result = await client.get<IApiClientResponse<{ success: boolean }>>(
        '/api/prime/send-email-verification-code',
        {
          params: {
            email,
            verifyUUID,
          },
        },
      );
      return result?.data?.data;
    } catch (error) {
      console.error(error);
    }

    return { success: true };
  }

  @backgroundMethod()
  async apiPrimeLogin({
    email,
    password,
    emailCode,
    verifyUUID,
    isRegister,
  }: {
    email: string;
    password: string;
    emailCode: string;
    verifyUUID: string;
    isRegister: boolean;
  }) {
    await timerUtils.wait(600);
    try {
      const client = await this.getClient(EServiceEndpointEnum.Prime);
      const result = await client.post<
        IApiClientResponse<{ success: boolean }>
      >('/api/prime/login', {
        data: { email, password, emailCode, verifyUUID, isRegister },
      });
      return result?.data?.data;
    } catch (error) {
      console.error(error);
    }
    return { success: false };
  }

  @backgroundMethod()
  @toastIfError()
  async ensurePrimeLoginValidEmail(email: string) {
    if (!stringUtils.isValidEmail(email)) {
      // TODO i18n error
      throw new OneKeyLocalError('Invalid email');
    }
  }

  @backgroundMethod()
  @toastIfError()
  async startPrimeLogin() {
    const { email } = await this.promptPrimeLoginEmailDialog();

    // TODO move to UI
    const { isRegistered, verifyUUID, captchaRequired, emailCodeRequired } =
      // TODO close loading dialog and reject promise
      await this.withDialogLoading(
        {
          // title: 'Checking email',
          title: appLocale.intl.formatMessage({
            id: ETranslations.global_processing,
          }),
        },
        async () =>
          this.apiPreparePrimeLogin({
            email,
          }),
      );
    const isRegister = !isRegistered;

    const { masterPassword } = await this.promptPrimeLoginPasswordDialog({
      email,
      isRegister,
    });
    ensureSensitiveTextEncoded(masterPassword);

    if (captchaRequired) {
      // TODO captcha verify (register, or login retry 5 times)
    }

    let code = '';
    if (emailCodeRequired) {
      ({ code } = await this.promptPrimeLoginEmailCodeDialog({
        email,
        verifyUUID,
      }));
    }

    // TODO move to UI
    const { success } = await this.withDialogLoading(
      {
        // title: 'Logging in',
        title: appLocale.intl.formatMessage({
          id: ETranslations.global_processing,
        }),
      },
      async () =>
        this.apiPrimeLogin({
          email,
          password: masterPassword,
          emailCode: code,
          verifyUUID,
          isRegister,
        }),
    );

    return {
      success,
      email,
      masterPassword,
      isRegister,
      code,
      captcha: 'mock-captcha',
      verifyUUID,
    };
  }

  @backgroundMethod()
  async promptPrimeLoginEmailDialog() {
    // eslint-disable-next-line no-async-promise-executor
    const email = await new Promise<string>(async (resolve, reject) => {
      const promiseId = this.backgroundApi.servicePromise.createCallback({
        resolve,
        reject,
      });
      await primeLoginDialogAtom.set((v) => ({
        ...v,
        promptPrimeLoginEmailDialog: promiseId,
      }));
    });
    await this.ensurePrimeLoginValidEmail(email);
    return { email };
  }

  @backgroundMethod()
  @toastIfError()
  async resolvePrimeLoginEmailDialog({
    promiseId,
    email,
  }: {
    promiseId: number;
    email: string;
  }) {
    if (isString(email)) {
      // eslint-disable-next-line no-param-reassign
      email = email.trim();
    }
    await this.ensurePrimeLoginValidEmail(email);
    await primeLoginDialogAtom.set((v) => ({
      ...v,
      promptPrimeLoginEmailDialog: undefined,
    }));
    await this.backgroundApi.servicePromise.resolveCallback({
      id: promiseId,
      data: email,
    });
  }

  @backgroundMethod()
  async promptForgetMasterPasswordDialog() {
    const result = await new Promise(
      // eslint-disable-next-line no-async-promise-executor
      async (resolve, reject) => {
        const promiseId = this.backgroundApi.servicePromise.createCallback({
          resolve,
          reject,
        });
        await primeLoginDialogAtom.set((v) => ({
          ...v,
          promptForgetMasterPasswordDialog: {
            promiseId,
          },
        }));
      },
    );
    return result;
  }

  @backgroundMethod()
  @toastIfError()
  async resolveForgetMasterPasswordDialog({
    promiseId,
  }: {
    promiseId: number;
  }) {
    await primeLoginDialogAtom.set((v) => ({
      ...v,
      promptForgetMasterPasswordDialog: undefined,
    }));
    await this.backgroundApi.servicePromise.resolveCallback({
      id: promiseId,
      data: true,
    });
  }

  @backgroundMethod()
  async promptPrimeLoginPasswordDialog({
    email,
    isRegister,
    isVerifyMasterPassword,
    isChangeMasterPassword,
    serverUserInfo,
  }: {
    email?: string;
    isRegister: boolean;
    isVerifyMasterPassword?: boolean;
    isChangeMasterPassword?: boolean;
    serverUserInfo?: IPrimeServerUserInfo;
  }) {
    const masterPassword = await new Promise<string>(
      // eslint-disable-next-line no-async-promise-executor
      async (resolve, reject) => {
        const promiseId = this.backgroundApi.servicePromise.createCallback({
          resolve,
          reject,
        });
        await primeLoginDialogAtom.set(
          (v): IPrimeLoginDialogAtomData => ({
            ...v,
            promptPrimeLoginPasswordDialog: {
              email: email || '',
              isRegister,
              isVerifyMasterPassword,
              isChangeMasterPassword,
              serverUserInfo,
              promiseId,
            },
          }),
        );
      },
    );
    ensureSensitiveTextEncoded(masterPassword);
    return { masterPassword };
  }

  @backgroundMethod()
  @toastIfError()
  async resolvePrimeLoginPasswordDialog({
    promiseId,
    password,
  }: {
    promiseId: number;
    password: string;
  }) {
    ensureSensitiveTextEncoded(password);
    await timerUtils.wait(300);
    await primeLoginDialogAtom.set((v) => ({
      ...v,
      promptPrimeLoginPasswordDialog: undefined,
    }));
    await this.backgroundApi.servicePromise.resolveCallback({
      id: promiseId,
      data: password,
    });
  }

  @backgroundMethod()
  async promptPrimeLoginEmailCodeDialog({
    email,
    verifyUUID,
  }: {
    email: string;
    verifyUUID: string;
  }) {
    // eslint-disable-next-line no-async-promise-executor
    const code = await new Promise<string>(async (resolve, reject) => {
      const promiseId = this.backgroundApi.servicePromise.createCallback({
        resolve,
        reject,
      });
      await primeLoginDialogAtom.set((v) => ({
        ...v,
        promptPrimeLoginEmailCodeDialog: {
          email,
          verifyUUID,
          promiseId,
        },
      }));
    });
    return { code };
  }

  @backgroundMethod()
  @toastIfError()
  async resolvePrimeLoginEmailCodeDialog({
    promiseId,
    code,
  }: {
    promiseId: number;
    code: string;
  }) {
    if (!code || code.length !== 6) {
      throw new OneKeyLocalError('Invalid code');
    }
    await primeLoginDialogAtom.set((v) => ({
      ...v,
      promptPrimeLoginEmailCodeDialog: undefined,
    }));
    await this.backgroundApi.servicePromise.resolveCallback({
      id: promiseId,
      data: code,
    });
  }

  @backgroundMethod()
  async cancelPrimeLogin({
    promiseId,
    dialogType,
  }: {
    promiseId: number;
    dialogType: IPrimeLoginDialogKeys;
  }) {
    const error = new PrimeLoginDialogCancelError();
    await primeLoginDialogAtom.set((v) => ({
      ...v,
      [dialogType]: undefined,
    }));
    return this.backgroundApi.servicePromise.rejectCallback({
      id: promiseId,
      error,
    });
  }

  @backgroundMethod()
  async sendEmailOTP(scene: string) {
    if (!scene) {
      throw new OneKeyLocalError('sendEmailOTP ERROR: Invalid scene');
    }
    const client = await this.getOneKeyIdClient(EServiceEndpointEnum.Prime);
    const result = await client.post<
      IApiClientResponse<{
        resendAt: number;
        uuid: string;
      }>
    >('/prime/v1/general/emailOTP', {
      scene,
    });
    return result?.data?.data;
  }

  @backgroundMethod()
  async apiGetCustomerJWT() {
    const client = await this.getPrimeClient();
    const result = await client.get<IApiClientResponse<{ token: string }>>(
      '/prime/v1/general/customer_jwt',
    );
    return result?.data?.data;
  }

  @backgroundMethod()
  async getLocalUserInfo() {
    return primePersistAtom.get();
  }
}

export default ServicePrime;
