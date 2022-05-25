import type {GetTokenInteractor} from '../../usecase/getToken';
import type {SetTokenInteractor} from '../../usecase/setToken';
import {Result} from '../../../util/result';
import type {FunctionError} from '../../../util/result';

type MessagingError = 'messaging-error';

type GetTokenResponse = Result<
  string | undefined,
  FunctionError<GetTokenInteractor['getToken']> | MessagingError
>;

type SetTokenResponse = Result<
  undefined,
  FunctionError<SetTokenInteractor['setToken']> | MessagingError
>;

export type {GetTokenResponse, SetTokenResponse, MessagingError};