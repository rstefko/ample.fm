## *Ample.fm*: [Ampache](https://ampache.org/) based music player for your cloud. Optimized for ownCloud / Nextcloud Music. 
Built with [Svelte](https://svelte.dev/) & [howler.js](https://github.com/goldfire/howler.js)
Based on [Ample v2](https://github.com/mitchray/ample).

<img src="https://github.com/mitchray/ample/assets/5735900/e2564e30-d7af-4fc8-b2e1-bbff93a3356e" width=800 alt="Ample screenshot" />

## Features
- 5 star rating
- Smart autoplay when nearing end of the queue
- Dark & light mode with adaptive interface colors
- Fade out/in on pause/resume/next/previous
- Media keys support
- Toggleable notifications for
  - Alternate song versions (radio edit, acoustic, live, demo etc)
  - Missing volume gain tags
  - Missing song rating
  - Missing/untimestamped song lyrics
- Same powerful Advanced Search as Ampache
- Compare an artist's collection with MusicBrainz recordings (if the artist has an MBID associated with it)
- Skip songs below a specified rating when adding to queue
- 'Unrated' dashboard + Multi-rater

## Setup
- Install [ownCloud Music](https://marketplace.owncloud.com/apps/music)
- Generate API password in ownCloud Music settings
- Enable CORS for `https://ample.fm` in ownCloud `config.php`
- If your setup runs on subdomain append it to domain name (eg. example.com/owncloud)
- If your setup requires /index.php append it to domain name (eg. nextcloud.example.com/index.php)

```
'cors.allowed-domains' => [
    'https://ample.fm'
  ],
```

## Developing
- Clone the Ample.fm repository and from the ample.fm directory ```cd ample.fm```
- Install packages ```npm ci```
- For development and hot reloading ```npm run dev```
- For building ```npm run build```, and see the contents of ```dist```

Additional console logging can be enabled by setting ```debugMode true``` in ```src/stores/server.js``` or by calling ```window.debugMode.set(true)``` from browser console.
