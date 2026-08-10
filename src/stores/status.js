import { readable, writable } from 'svelte/store';

function persistedWritable(key, initialValue) {
    const hasStorage = typeof localStorage !== 'undefined';

    let startValue = initialValue;

    if (hasStorage) {
        try {
            const raw = localStorage.getItem(key);
            if (raw !== null) {
                startValue = JSON.parse(raw);
            }
        } catch (e) {
            console.error(`Error reading localStorage key "${key}":`, e);
        }
    }

    const store = writable(startValue);

    if (hasStorage) {
        store.subscribe((value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.error(`Error writing localStorage key "${key}":`, e);
            }
        });
    }

    return store;
}

export let NowPlayingQueue = persistedWritable('AmpleNowPlayingQueue', []);
export let NowPlayingIndex = persistedWritable('AmpleNowPlayingIndex', 0);

export let IsPlaying   = writable(false);
export let IsMuted     = writable(false);
export let CurrentMedia = persistedWritable('AmpleCurrentMedia', null);
export let CurrentTime = writable(null);
export let TimeToggled = persistedWritable('AmpleTimeToggled', false);

export let PageTitle = persistedWritable('AmplePageTitle', '');
export let SearchQuery = persistedWritable('AmpleSearchQuery', '');
export let ShowSearch  = persistedWritable('AmpleShowSearch', false);
export let ShowLyrics    = persistedWritable('AmpleShowLyrics', false);
export let FullScreenEnabled = persistedWritable('AmpleFullScreenEnabled', false);
export let TabHistory = persistedWritable('AmpleTabHistory', {});
export let FilterHistory = persistedWritable('AmpleFilterHistory', {});
export let PageLoadedKey = persistedWritable('AmplePageLoadedKey', null);

export let SidebarIsOpen   = persistedWritable('AmpleSidebarIsOpen', false);
export let SidebarIsPinned = persistedWritable('AmpleSidebarIsPinned', false);

export let QueueIsOpen   = persistedWritable('AmpleQueueIsOpen', false);
export let QueueIsPinned = persistedWritable('AmpleQueueIsPinned', false);
export let QueueIsUpdating = persistedWritable('AmpleQueueIsUpdating', false);

export let PlayerVolume               = persistedWritable('AmplePlayerVolume', 50);
export let RepeatEnabled              = persistedWritable('AmpleRepeatEnabled', false);

export let AutoPlayEnabled  = persistedWritable('AmpleAutoPlayEnabled', false);
export let AutoPlayPlaylist = persistedWritable('AmpleAutoPlayPlaylist', null);

export let ShowNotificationGainTagsMissing      = persistedWritable('AmpleShowNotificationGainTagsMissing', false);
export let ShowNotificationRatingMissing        = persistedWritable('AmpleShowNotificationRatingMissing', false);
export let ShowNotificationAlternateVersions    = persistedWritable('AmpleShowNotificationAlternateVersions', false);
export let ShowNotificationLyricsMissing        = persistedWritable('AmpleShowNotificationLyricsMissing', false);
export let ShowNotificationLyricsNotTimestamped = persistedWritable('AmpleShowNotificationLyricsNotTimestamped', false);

export let ShowExpandedAlbums = persistedWritable('AmpleShowExpandedAlbums', false);
export let GroupAlbumsByReleaseType = persistedWritable('AmpleGroupAlbumsByReleaseType', false);

export let SkipBelow       = persistedWritable('AmpleSkipBelow', false);
export let SkipBelowRating = persistedWritable('AmpleSkipBelowRating', 3);

export let Theme     = persistedWritable('AmpleTheme', null);
export let customHue = persistedWritable('AmpleCustomHue', null);

export const IsMobile = readable(false, function start(set) {
    const mobile = window.matchMedia("(max-width: 679.99px)");

    mobile.onchange = (e) => {
        handleDeviceChange(e);
    };

    function handleDeviceChange(e) {
        set(e.matches);
    }

    // Kick-off
    handleDeviceChange(mobile);

    return function stop() {};
});