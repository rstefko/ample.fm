import { tick } from "svelte";
import { get } from 'svelte/store';
import { Howl, Howler } from 'howler';
import { v4 as uuidv4 } from "uuid";
import { getSongVersions } from "./song";
import {
    addAlternateVersionsNotification,
    addGainTagsMissingNotification,
    addRatingMissingNotification,
    addLyricsMissingNotification,
    addLyricsNotTimestampedNotification,
} from "./notification";
import { debugHelper, shuffleArray, sleep, lyricsAreTimestamped } from './helper';
import {
    NowPlayingQueue,
    NowPlayingIndex,
    QueueIsUpdating,
    IsPlaying,
    IsMuted,
    CurrentMedia,
    PlayerVolume,
    RepeatEnabled,
    CurrentTime,
    IsMobile
} from '../stores/status';
import localforage from 'localforage';

/**
 * Interface with howler.js
 */
class Player {
    /**
     * Initialize data
     */
    constructor() {
        this.howl = null;
        this.id = null;
        this.stopQueued = false;
        this.mediaSessionRegistered = false;

        // volume here takes the linear 0-100 value and converts into a logarithmic float from 0.0 to 1.0
        PlayerVolume.subscribe(value => {
            this.globalVolume = this.logVolume(value);
            
            if (this.howl) {
                this.howl.volume(this.globalVolume);
            }

            localStorage.setItem('AmplePlayerVolume', JSON.stringify(value));
        });

        NowPlayingQueue.subscribe(value => {
            this.nowPlayingQueue = value;
        });

        NowPlayingIndex.subscribe(value => {
            this.nowPlayingIndex = value;
        });

        IsPlaying.subscribe(value => {
            this.isPlaying = value;
        });

        IsMuted.subscribe(value => {
            this.isMuted = value;
        });

        CurrentMedia.subscribe(value => {
            this.currentMedia = value;
        });

        RepeatEnabled.subscribe(value => {
            this.repeatEnabled = value;
        });
    }

    logVolume(val) {
        return Math.pow(val / 100, 2);
    }

    /**
     * Clear the queue
     */
    clearQueue() {
        // clear all tracks EXCEPT currently playing, unless it is the only item in queue
        if (this.nowPlayingQueue.length > 1) {
            this.clearAllExceptCurrent();
        } else {
            this.clearAll();
        }
    }

    /**
     * Clear all items in queue
     */
    clearAll() {
        this.stopQueued = true;
        this.stop();
        CurrentMedia.set(null);
        this.setQueueItems([]).then(() => {
            NowPlayingIndex.set(0);
            IsPlaying.set(false);
        })
    }

    /**
     * Clear all tracks EXCEPT currently playing
     */
    clearAllExceptCurrent() {
        let current = [this.nowPlayingQueue[this.nowPlayingIndex]];
        this.setQueueItems(current).then(() => {
            NowPlayingIndex.set(0);
        });
    }

    /**
     * Restart the queue
     */
    restartQueue() {
        if (this.repeatEnabled) {
            debugHelper('queue restarted');
            NowPlayingIndex.set(0);
            this.start(this.nowPlayingQueue[0]);
        } else {
            this.stop();
        }
    }

    /**
     * Create howler and begin playing
     */
    async start(song) {
        let self = this;

        debugHelper('start!');

        // Load from queue if no song is directly passed
        if (!song) {
            song = this.nowPlayingQueue[this.nowPlayingIndex];
        }

        if (song) {
            CurrentMedia.set(song);

            // Notify if missing gain tags
            if (song.r128_track_gain === null && song.replaygain_track_gain === null) {
                addGainTagsMissingNotification(song);
            }

            if (!song.lyrics) {
                addLyricsMissingNotification(song);
            }

            if (song.lyrics && !lyricsAreTimestamped(song.lyrics)) {
                addLyricsNotTimestampedNotification(song);
            }
        } else {
            debugHelper('No song IDs could be found');
            this.clearAll();
            return false;
        }

        try {
            let trackUrl = this.currentMedia.url;
            const audioBlob = await localforage.getItem(this.currentMedia.id);
            if (audioBlob) {
                trackUrl = URL.createObjectURL(audioBlob);

                debugHelper(`Loading track ${this.currentMedia.id} from cache`);
            }
            this.howl = new Howl({
                src: [trackUrl],
                format: [this.currentMedia.stream_format],
                html5: true,
                volume: this.globalVolume,
                mute: this.isMuted
            });
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: song.title || '',
                    artist: (song.artist) ? song.artist.name : '',
                    album: (song.album) ? song.album.name : '',
                    artwork: [
                        { src: `${song.art}&thumb=22` },
                    ]
                });

                if (!this.mediaSessionRegistered) {
                    debugHelper('Registering MediaSession handlers');
                    
                    navigator.mediaSession.setActionHandler('play', function () {
                        debugHelper('MediaSession: play');
                        self.playPause();
                    });
                    navigator.mediaSession.setActionHandler('pause', function () {
                        debugHelper('MediaSession: pause');
                        self.playPause();
                    });
                    navigator.mediaSession.setActionHandler('stop', function () {
                        debugHelper('MediaSession: stop');
                        self.stop();
                    });
                    navigator.mediaSession.setActionHandler('nexttrack', function () {
                        debugHelper('MediaSession: nexttrack');
                        self.next();
                    });
                    navigator.mediaSession.setActionHandler('previoustrack', function () {
                        debugHelper('MediaSession: previoustrack');
                        self.previous();
                    });

                    this.mediaSessionRegistered = true;
                }
            }

            // Start playing once loaded
            this.howl.once('load', function(){
                debugHelper('Howl loaded');
                this.howl.play();
            }.bind(this));

            this.howl.on('play', function() {
                debugHelper('Howl playing');
                IsPlaying.set(true);
                self.fadeIn();
                self.recordLastPlayed();
                self.updateCurrentTime();
            });

            this.howl.on('pause', function() {
                debugHelper('Howl paused');
                IsPlaying.set(false);
            });

            // Fires when the sound finishes playing.
            this.howl.on('end', function() {
                debugHelper('Howl finished');
                self.next();
            });

            this.howl.on('loaderror', function(id, e) {
                console.error(`Howl load error (id=${id}): ${e}`);

                IsPlaying.set(false);

                self.next();
            });

            this.howl.on('playerror', function(id, e) {
                console.error(`Howl play error (id=${id}): ${e}`);

                IsPlaying.set(false);

                self.next();
            });

            // Search for song versions if artist is present (i.e. songs)
            if (song.artist) {
                getSongVersions(song.title, song.artist.name)
                    .then((result) => {
                        if (!result.error && result.length > 1) {
                            song.versionsCount = result.length - 1;
                            addAlternateVersionsNotification(song);
                        }
                    });
            }
        } catch (e) {
            console.warn('Something went wrong during start', e);
            self.next();
        }
    }

    async setQueueItems(arr) {
        QueueIsUpdating.set(true);
        await tick();

        // each media item needs a unique _id
        arr = arr.map((item, index) => ({ ...item, _id: uuidv4()}));

        NowPlayingQueue.set(arr);
        QueueIsUpdating.set(false);
    }

    async preloadSongs(songs) {
        for (const song of songs) {
            try {
                let audioBlob = await localforage.getItem(song.id);
                if (audioBlob != null) {
                    debugHelper(`Song ${song.id} already in cache`);
                    continue;
                }

                const response = await fetch(song.url);
                audioBlob = await response.blob();
                
                await localforage.setItem(song.id, audioBlob);
                
                debugHelper(`Song ${song.id} saved to cache`);
            } catch (error) {
                debugHelper(`Error saving song ${song.id} to cache: ${error}`);
            }
        }
    }

    recordLastPlayed() {
        let self = this;

        if (this.howl && this.howl.seek() > 3) {
            // add/update lastPlayed property
            this.nowPlayingQueue[this.nowPlayingIndex].lastPlayed = Date.now();

            // update the store with our modified object
            this.setQueueItems(this.nowPlayingQueue);
        } else {
            window.setTimeout(function() {
                self.recordLastPlayed();
            }, 500);
        }
    }

    /**
     * Stop playback and destroy howler
     */
    stop() {
        if (this.howl) {
            IsPlaying.set(false);
            this.disposeHowl();
        }
        this.stopQueued = false;
    }

    disposeHowl() {
        if (this.howl) {
            this.howl.stop();
            this.howl.off();
            this.howl.unload();
            this.howl = null;
        }
    }

    updateCurrentTime() {
        if (!this.isPlaying)
            return;

        CurrentTime.set(this.howl.seek());

        requestAnimationFrame(() => {
            this.updateCurrentTime();
        });
    }

    /**
     * Play/pause
     */
    async playPause() {
        debugHelper('play/pause!');

        if (this.howl) {
            if (this.howl.playing()) {
                await this.fadeOut();
                this.howl.pause();
            } else {
                this.howl.play();
            }
        } else {
            await this.start();
        }
    }

    /**
     * Play previous song
     */
    async previous(event) {
        debugHelper('previous!');

        if (this.nowPlayingIndex > -1) {

            // If playback has passed a certain point, restart song instead
            if (this.howl.seek() < 3) {
                NowPlayingIndex.update(n => n - 1);
            }
        }

        // if manually called, fade out
        if (event && event.target) {
            await this.fadeOut();
        }

        this.stop();
        this.start(this.nowPlayingQueue[this.nowPlayingIndex]);
    }

    /**
     * Play next song
     */
    async next(event) {
        debugHelper('next!');

        // if manually called, fade out
        if (event && event.target) {
            await this.fadeOut();
        }

        this.stop();

        // if song has no rating by the end of play, notify
        addRatingMissingNotification(this.currentMedia);

        // Increment index and play next
        if (this.nowPlayingIndex + 1 < this.nowPlayingQueue.length) {
            NowPlayingIndex.update(n => n + 1);
            this.start(this.nowPlayingQueue[this.nowPlayingIndex]);
        } else {
            this.restartQueue();
        }
    }

    /**
     * Shuffle all existing songs in queue
     */
    shuffle() {
        let tempArray = get(NowPlayingQueue);

        this.clearAll();

        tempArray = shuffleArray(tempArray);

        this.setQueueItems(tempArray).then(() => {
            NowPlayingIndex.set(0);
            this.start();
        });
    }

    /**
     * Toggle repeat of queue
     */
    repeat() {
        let inverted = !this.repeatEnabled;
        localStorage.setItem('AmpleRepeatEnabled', JSON.stringify(inverted));
        RepeatEnabled.set(inverted);
        debugHelper('repeat: ' + this.repeatEnabled);
    }

    /**
     * Replace queue with selected songs
     * @param {object} songs
     */
    playNow(songs) {
        this.clearAll();
        this.preloadSongs(songs);
        this.setQueueItems(songs).then(() => {
            this.start();
        });
    }

    /**
     * Insert songs after currently playing song
     * @param {object} songs
     */
    async playNext(songs) {
        this.preloadSongs(songs);

        let tempArray = get(NowPlayingQueue);
        let queueLength = tempArray.length;
        tempArray.splice(this.nowPlayingIndex + 1, 0, ...songs);
        await this.setQueueItems(tempArray);

        // Start playing if queue was empty
        if (queueLength === 0) {
            this.start();
        }
    }

    /**
     * Add songs to the end of the queue
     * @param {object} songs
     */
    async playLast(songs) {
        this.preloadSongs(songs);

        let tempArray = get(NowPlayingQueue);
        let queueLength = tempArray.length;
        tempArray.push(...songs);
        await this.setQueueItems(tempArray);

        // Start playing if queue was empty
        if (queueLength === 0) {
            this.start();
        }
    }

    /**
     * Play song at this index
     * @param {number} index
     */
    playSelected(index) {
        this.disposeHowl();

        NowPlayingIndex.set(index);

        this.start();
    }

    fadeIn() {
        this.fade(0, this.globalVolume, 500);
    }

    async fadeOut() {
        this.fade(this.globalVolume, 0, 300)
        await sleep(300);
    }

    fade(from, to, duration) {
        if (this.isMuted)
            return;

        // Causes issue during pause on Safari from Control Center
        if (get(IsMobile))
            return;

        debugHelper('Howl fade');

        this.howl.fade(from, to, duration);
    }
}

export default Player;