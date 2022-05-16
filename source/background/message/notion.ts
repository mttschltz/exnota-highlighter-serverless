import {onMessage, sendMessage} from 'webext-bridge';
import { createLog } from '../../util/log';
import {validateToken} from '../api/notion';
import { newGetTokenInteractor, GetTokenRepo } from '../usecase/getToken';
import { GetTokenResponse } from './webext-bridge';

let listened = false;

type MessageStatus =
  | 'success'
  | 'notion-invalid-token'
  | 'notion-rate-limit-error'
  | 'notion-request-error' // an error likely inside our control
  | 'notion-other-error' // an error likely outside our control
  | 'unknown-error';

const startGetTokenListener = (repo: GetTokenRepo): void => {
  const interactor = newGetTokenInteractor(repo)
  
  onMessage('notion.getToken', async () => {
    const result = await interactor.getToken()
    if (!result.ok) {
      return {
        status: result.errorType
      }
    }
    return {
      token: result.value,
      status: 'success' as const
    }
  });
};

const getToken = async (): Promise<GetTokenResponse> => {
  try {
    const value = await sendMessage(
      'notion.getToken',
      {},
      'background'
    );
    return value;
  } catch {
    return {
      status: 'messaging-error'
    };
  }
}

// TODO: Remove
const listen = (): void => {
  if (listened) {
    throw new Error('Already listening for Notion messages');
  }
  listened = true;

  onMessage('setup.validate-notion-integration-token', async ({data}) => {
    const result = await validateToken(data.token);

    return result;
  });
};

type NotionMessageResult = MessageStatus | 'messaging-error';

const validateIntegrationToken = async (
  token: string
): Promise<NotionMessageResult> => {
  try {
    const value = await sendMessage(
      'setup.validate-notion-integration-token',
      {token},
      'background'
    );
    return value.result;
  } catch {
    return 'messaging-error';
  }
};

export type {MessageStatus};
export {getToken, listen, startGetTokenListener, validateIntegrationToken};
