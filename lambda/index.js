// "Alexa, ask M P D to play": plays an MPD httpd stream on the Echo.
// Plain CommonJS, since Alexa-hosted skills run lambda/index.js as it is, with no build step.
const Alexa = require('ask-sdk-core');

// your stream, see the README for what Alexa will accept
const STREAM_URL = 'https://music.example.com/stream.mp3';
// Alexa resumes whatever it last played under a token, so each play gets a new one
const TOKEN_PREFIX = 'mpd-stream';

const PLAY_INTENTS = ['PlayIntent', 'AMAZON.ResumeIntent', 'AMAZON.StartOverIntent'];
const STOP_INTENTS = ['AMAZON.PauseIntent', 'AMAZON.StopIntent', 'AMAZON.CancelIntent'];

function getIntentName(handlerInput) {
  const isIntent = Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
  if (!isIntent) {
    return null;
  }

  return Alexa.getIntentName(handlerInput.requestEnvelope);
}

const playStreamHandler = {
  canHandle(handlerInput) {
    const isLaunch = Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';

    return isLaunch || PLAY_INTENTS.includes(getIntentName(handlerInput));
  },
  handle(handlerInput) {
    // a live stream has no position to resume from, so always start at 0
    return handlerInput.responseBuilder
      .addAudioPlayerPlayDirective('REPLACE_ALL', STREAM_URL, `${TOKEN_PREFIX}-${Date.now()}`, 0, null, {
        title: 'MPD',
      })
      .getResponse();
  },
};

const stopStreamHandler = {
  canHandle(handlerInput) {
    return STOP_INTENTS.includes(getIntentName(handlerInput));
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.addAudioPlayerStopDirective().getResponse();
  },
};

const helpHandler = {
  canHandle(handlerInput) {
    return getIntentName(handlerInput) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.speak('Say play to start the music, or stop to end it.').getResponse();
  },
};

// AudioPlayer events, playback-control buttons, next/shuffle/loop and session end
// all need an answer, and there is nothing to do for any of them
const ignoreHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput) {
    // System.ExceptionEncountered and PlaybackFailed carry Alexa's reason, see CloudWatch
    const { request } = handlerInput.requestEnvelope;
    console.log(request.type, JSON.stringify(request.error ?? request.cause ?? {}));

    return handlerInput.responseBuilder.getResponse();
  },
};

const logErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error(error);

    return handlerInput.responseBuilder.getResponse();
  },
};

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(playStreamHandler, stopStreamHandler, helpHandler, ignoreHandler)
  .addErrorHandlers(logErrorHandler)
  .lambda();
