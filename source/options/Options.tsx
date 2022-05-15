import * as React from 'react';
import {isEqual} from 'lodash';
import {
  Anchor,
  Grommet,
  Image,
  Heading,
  Page,
  PageContent,
  TextInput,
  Text,
  Box,
  Header,
  Paragraph,
  FormField,
  Button,
  Diagram,
  Stack,
  BoxProps,
  Form,
} from 'grommet';
import useEventListener from '@use-it/event-listener';
import {browser} from 'webextension-polyfill-ts';
import {useCallback, useEffect, useRef, useState} from 'react';
import {BackgroundType} from 'grommet/utils';
import {hpe} from 'grommet-theme-hpe';
import {Translate, useTranslate} from '../util/i18n';
import {options as optionsConfig} from '../util/options';
import {validateIntegrationToken} from '../message/notion';

type StepLabelState = 'complete' | 'active' | 'upcoming';

const StepLabel: React.FC<{
  id: string;
  label: string;
  num: string;
  state: StepLabelState;
  pad: BoxProps['pad'];
}> = ({id, label, num, pad, state}) => {
  let background: BackgroundType;
  switch (state) {
    case 'active':
      background = 'brand';
      break;
    case 'complete':
      background = 'status-ok';
      break;
    case 'upcoming':
      background = 'status-unknown';
      break;
    default:
      throw new Error('Unhandled step label state');
  }
  return (
    <Box direction="row" align="center" gap="xsmall" id={id} pad={pad}>
      <Box
        round="full"
        background={background}
        width="2em"
        height="2em"
        justify="center"
        align="center"
      >
        {num}
      </Box>
      {label}
    </Box>
  );
};

const InstructionsHeading: React.FC = ({children}) => {
  return (
    <Heading level={3} size="5" margin={{bottom: 'small'}}>
      {children}
    </Heading>
  );
};

const InstructionsDescription: React.FC = ({children}) => {
  return (
    <Paragraph margin={{top: 'none', bottom: 'medium'}} fill={true}>
      {children}
    </Paragraph>
  );
};

const InstructionsColumns: React.FC = ({children}) => {
  return (
    <Box direction="row" gap="medium" margin={{bottom: 'medium'}}>
      {children}
    </Box>
  );
};

const InstructionsColumnText: React.FC = ({children}) => {
  return (
    <Box basis="50%" flex={{shrink: 0}}>
      {children}
    </Box>
  );
};
const InstructionsColumnImage: React.FC = ({children}) => {
  return (
    <Box border="all" alignSelf="start">
      {children}
    </Box>
  );
};

const InstructionsStep: React.FC = ({children}) => {
  return (
    <Paragraph margin={{top: 'none', bottom: 'medium'}}>{children}</Paragraph>
  );
};

type Options = Parameters<typeof optionsConfig['setAll']>[0];

const useApiValidator = (): {
  validateToken: (
    token: string
  ) => Promise<ReturnType<typeof validateIntegrationToken>>;
} => {
  const validateToken = useCallback(async (token: string): Promise<
    ReturnType<typeof validateIntegrationToken>
  > => {
    return validateIntegrationToken(token);
  }, []);
  return {
    validateToken,
  };
};

const useOptions = (): {
  notionIntegrationToken: string;
  synced: boolean;
  formRef: React.RefObject<HTMLFormElement>;
  values: {
    notionIntegrationToken: string;
  };
} => {
  const [values, setValues] = useState<Options>({
    notionIntegrationToken: '',
  });
  const getAllAndSet = useCallback(async (): Promise<void> => {
    const opts = await optionsConfig.getAll();
    if (!isEqual(opts, values)) {
      setValues(opts);
    }
  }, [values]);
  useEffect(() => {
    getAllAndSet();
  }, [getAllAndSet]);

  const formRef = useRef<HTMLFormElement>(null);
  useEventListener(
    'options-sync:form-synced',
    getAllAndSet,
    formRef.current,
    {}
  );

  const [synced, setSynced] = useState(false);
  useEffect(() => {
    const sync = async (): Promise<void> => {
      if (formRef.current) {
        if (synced) {
          // Need to resync otherwise it doesn't pull in the initial value. Maybe because, at time
          // of writing, the input isn't rendered the first time the form is rendered, as due to
          // options.synced being false.
          await optionsConfig.stopSyncForm();
        }
        await optionsConfig.syncForm(formRef.current);
      }
      setSynced(true);
    };
    sync();
  }, [synced]);

  return {
    formRef,
    notionIntegrationToken: values.notionIntegrationToken,
    synced,
    values,
  };
};

type Step = 'connect' | 'select' | 'start';

const Options: React.FC = () => {
  const [step, setStep] = useState<Step>('connect');
  const t = useTranslate(['setup']);
  const options = useOptions();
  const [showTokenError, setShowTokenError] = useState(false);
  const apiValidator = useApiValidator();

  const stepLabelState = useCallback(
    (label: Step): StepLabelState => {
      switch (step) {
        case 'connect':
          switch (label) {
            case 'connect':
              return 'active';
            default:
              return 'upcoming';
          }
        case 'select':
          switch (label) {
            case 'connect':
              return 'complete';
            case 'select':
              return 'active';
            default:
              return 'upcoming';
          }
        case 'start':
          switch (label) {
            case 'connect':
            case 'select':
              return 'complete';
            default:
              return 'active';
          }
        default:
          throw new Error('Unhandled step type');
      }
    },
    [step]
  );
  const connect = useCallback(async () => {
    if (options.notionIntegrationToken === '') {
      setShowTokenError(true);
      return;
    }
    const result = await apiValidator.validateToken(
      options.notionIntegrationToken
    );
    if (result === 'success') {
      setStep('select');
    } else if (result === 'notion-invalid-token') {
      // TODO: Update error message
      setShowTokenError(true);
    } else {
      // TODO: update error message
      setShowTokenError(true);
    }
  }, [apiValidator, options.notionIntegrationToken]);

  return (
    <Grommet theme={hpe}>
      <Page kind="narrow" pad={{bottom: 'xlarge'}}>
        <PageContent>
          <Form ref={options.formRef}>
            {options.synced && (
              <>
                <Header>
                  <Box>
                    <Heading level="1" size="2">
                      {t('setup:title')}
                    </Heading>
                  </Box>
                  <Box align="center" direction="row" gap="xsmall">
                    <Image
                      width="36px"
                      height="36px"
                      src="../assets/icons/favicon-48x48.png"
                    />{' '}
                    <Heading level="3" size="4" alignSelf="center">
                      {browser.i18n.getMessage('extensionName')}
                    </Heading>
                  </Box>
                </Header>
                <Stack>
                  <Box
                    direction="row"
                    background="light-2"
                    pad="small"
                    justify="between"
                  >
                    <StepLabel
                      id="setup-step1"
                      label={t('setup:connect.stepLabel')}
                      num={t('setup:connect.stepNumber')}
                      state={stepLabelState('connect')}
                      pad={{right: 'medium'}}
                    />
                    <StepLabel
                      id="setup-step2"
                      label={t('setup:select.stepLabel')}
                      num={t('setup:select.stepNumber')}
                      state={stepLabelState('select')}
                      pad={{left: 'medium', right: 'medium'}}
                    />
                    <StepLabel
                      id="setup-step3"
                      label={t('setup:start.stepLabel')}
                      num={t('setup:start.stepNumber')}
                      state={stepLabelState('start')}
                      pad={{left: 'medium'}}
                    />
                  </Box>
                  <Diagram
                    connections={[
                      {
                        fromTarget: 'setup-step1',
                        toTarget: 'setup-step2',
                        thickness: '2px',
                        color: step === 'connect' ? 'status-unknown' : 'brand',
                        anchor: 'horizontal',
                      },
                      {
                        fromTarget: 'setup-step2',
                        toTarget: 'setup-step3',
                        thickness: '2px',
                        color: step === 'start' ? 'brand' : 'status-unknown',
                        anchor: 'horizontal',
                      },
                    ]}
                  />
                </Stack>
                {step === 'connect' && (
                  <Box>
                    <Box>
                      <Heading level={2} size="2" margin={{bottom: 'xxsmall'}}>
                        {t('setup:connect.title')}
                      </Heading>
                      <Paragraph fill={true} margin={{top: 'none'}}>
                        {t('setup:connect.description')}
                      </Paragraph>
                      <Box
                        round="small"
                        pad="small"
                        border="all"
                        margin={{bottom: 'large'}}
                      >
                        {t('setup:connect.adminReminder')}
                      </Box>
                      <InstructionsHeading>
                        {t('setup:connect.createIntegrationTitle')}
                      </InstructionsHeading>
                      <InstructionsColumns>
                        <InstructionsColumnText>
                          <InstructionsStep>
                            {t('setup:connect.instruction1')}
                          </InstructionsStep>
                          <InstructionsStep>
                            <Translate i18nKey="connect.instruction2">
                              Go to{' '}
                              <Anchor href="https://www.notion.com/my-integrations">
                                https://www.notion.com/my-integrations
                              </Anchor>
                              .
                            </Translate>
                          </InstructionsStep>
                          <InstructionsStep>
                            {t('setup:connect.instruction3')}
                          </InstructionsStep>
                        </InstructionsColumnText>
                        <InstructionsColumnImage>
                          <Image src="../assets/setup/connect-3-new-integration-wide.png" />
                        </InstructionsColumnImage>
                      </InstructionsColumns>

                      <InstructionsHeading>
                        {t('setup:connect.createNameSelectTitle')}
                      </InstructionsHeading>
                      <InstructionsColumns>
                        <InstructionsColumnText>
                          <InstructionsStep>
                            {t('setup:connect.instruction4')}
                          </InstructionsStep>
                          <InstructionsStep>
                            {t('setup:connect.instruction5')}
                          </InstructionsStep>
                        </InstructionsColumnText>
                        <InstructionsColumnImage>
                          <Image src="../assets/setup/connect-4-5-name-and-workspace.png" />
                        </InstructionsColumnImage>
                      </InstructionsColumns>

                      <InstructionsHeading>
                        {t('setup:connect.configureCapabilitiesTitle')}
                      </InstructionsHeading>
                      <InstructionsDescription>
                        {t('setup:connect.configureCapabilitiesDescription')}
                      </InstructionsDescription>
                      <InstructionsColumns>
                        <InstructionsColumnText>
                          <InstructionsStep>
                            {t('setup:connect.instruction6')}
                          </InstructionsStep>
                          <InstructionsStep>
                            {t('setup:connect.instruction7')}
                          </InstructionsStep>
                        </InstructionsColumnText>
                        <InstructionsColumnImage>
                          <Image src="../assets/setup/connect-6-7-capabilities.png" />
                        </InstructionsColumnImage>
                      </InstructionsColumns>

                      <InstructionsHeading>
                        {t('setup:connect.getTokenTitle')}
                      </InstructionsHeading>
                      <InstructionsColumns>
                        <InstructionsColumnText>
                          <InstructionsStep>
                            {t('setup:connect.instruction8')}
                          </InstructionsStep>
                        </InstructionsColumnText>
                        <InstructionsColumnImage>
                          <Image src="../assets/setup/connect-8-submit-wide.png" />
                        </InstructionsColumnImage>
                      </InstructionsColumns>
                      <InstructionsColumns>
                        <InstructionsColumnText>
                          <InstructionsStep>
                            {t('setup:connect.instruction9')}
                          </InstructionsStep>
                          <FormField
                            label={t('setup:connect.integrationTokenLabel')}
                          >
                            <TextInput
                              id="notionIntegrationToken"
                              name="notionIntegrationToken"
                            />
                          </FormField>
                          {showTokenError && (
                            <Text color="status-critical">
                              {t('setup:connect.integrationTokenMissing')}
                            </Text>
                          )}
                        </InstructionsColumnText>
                        <InstructionsColumnImage>
                          <Image src="../assets/setup/connect-9-copy-token-blur.png" />
                        </InstructionsColumnImage>
                      </InstructionsColumns>
                    </Box>
                    <Box
                      direction="row"
                      gap="medium"
                      justify="end"
                      pad={{top: 'medium'}}
                    >
                      <Button
                        onClick={connect}
                        primary
                        label={t('setup:connect.next')}
                      />
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Form>
        </PageContent>
      </Page>
    </Grommet>
  );
};

export default Options;