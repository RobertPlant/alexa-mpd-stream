# alexa-mpd-stream

An Alexa skill that plays the http stream from your own MPD server on an Echo. "Alexa, ask M P D
to play" and whatever MPD is playing comes out of the Echo, "Alexa, stop" ends it.

The skills I found that play an arbitrary stream URL want a subscription. This one runs as your
own Alexa-hosted skill in the development stage, which is free and never needs certification. The
catch is that a development skill only works on Echos signed in to the same Amazon account as the
developer account, which for a house full of Echos is fine.

It isn't MPD specific, any mp3 or AAC stream over https works (Icecast, a radio station, etc).

## The stream

MPD needs an `httpd` output:

```
audio_output {
    type        "httpd"
    name        "Alexa"
    encoder     "lame"
    port        "8600"
    bitrate     "192"
    format      "44100:16:2"
    always_on   "yes"
    tags        "yes"
}
```

Alexa is fussy about the URL it will play:

- It has to be https on port 443 with a certificate from a real CA, so put a reverse proxy in front
  of MPD (nginx, Caddy). Self-signed certs get refused.
- The hostname has to resolve to a public IP in public DNS. A name that resolves to `192.168.x.x`
  is refused before the Echo is even told about it, the CloudWatch log just says "The URL
  specified in the Play directive is invalid".
- Mp3, AAC, HLS, PLS or M3U, between 16 and 384 kbps.

I didnt want to open a port at home for this, so the public name goes through a Cloudflare tunnel,
locked down to one long random path (`https://music.example.com/<random>/stream.mp3`) with
everything else on that name returning a 404. MPD's httpd output serves the stream on any path so
nothing needs rewriting.

Alexa's cloud only checks the URL, the Echo is what fetches the audio. If your router's DNS
answers the same name with the proxy's LAN address (split DNS), the Echo streams over the LAN
and the tunnel only ever sees Alexa's check. You can confirm it by looking at who is connected to
MPD's port while it plays.

## Setup

You need an Amazon developer account (https://developer.amazon.com) on the same Amazon login as
your Echos.

1. Fork this repo and set `STREAM_URL` at the top of `lambda/index.js` to your stream.
2. In the Alexa developer console, create a skill: custom model, Alexa-hosted (Node.js), and
   import it from your fork's git URL. Pick the locale your Echos use (en-GB or en-US).
3. Build the model, then on the Test tab set testing to "Development".
4. "Alexa, ask M P D to play".

If you dont want to fork, import this repo as it is and change `STREAM_URL` in the console's Code
tab, then Deploy.

The ASK CLI works too if you'd rather deploy from a terminal, `ask deploy` from a clone.

## Things that caught me out

- **"Ask M P D to play", not "open M P D".** Alexa takes "open" as opening an app on the device
  and says it isn't supported.
- **Acronyms in the invocation name are spelled with full stops** (`m. p. d.`). To rename it,
  change `invocationName` in `skill-package/interactionModels/custom/*.json` and rebuild.
- **Don't put "stream" in the invocation name.** Alexa sends it to the Fire TV video controls,
  "not supported on this device" again.
- **Every play gets a new AudioPlayer token.** If the token is reused Alexa resumes whatever it last
  played under that token instead of fetching the URL, which had me listening to the test station
  for a while.
- **The test simulator can't play audio**, it just says there was an unexpected error. Test on a
  real Echo.
- **The reasons for a failed play are in CloudWatch.** The skill logs Alexa's
  `System.ExceptionEncountered` and `PlaybackFailed` errors, open the Code tab then CloudWatch logs.
- **Restarting MPD drops the Echo**, ask it to play again.
- The Echo runs a few seconds behind anything else playing MPD (snapcast etc), it isn't synced.

## Licence

MIT
