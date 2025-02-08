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
    VolumeNormalizationEnabled,
    DynamicsCompressorEnabled,
    IsMobile,
    CurrentTime
} from '../stores/status';

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

        // volume normalization
        this.targetVolume = parseInt(-14);
        this.masteredVolume = null;
        this.gainNeeded = null;
        this.gainType = null;
        this.gainTagValue = null;

        // filter nodes
        this.activeFilters = [];
        this.filterFade = null;
        this.filterGain = null;
        this.filterCompressor = null;
        this.filterBiquad = null; //(for testing only)

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

        VolumeNormalizationEnabled.subscribe(value => {
            this.volumeNormalizationEnabled = value;
        });

        DynamicsCompressorEnabled.subscribe(value => {
            this.dynamicsCompressorEnabled = value;
        });

        CurrentMedia.subscribe(value => {
            this.currentMedia = value;
        });

        RepeatEnabled.subscribe(value => {
            this.repeatEnabled = value;
        });
    }

    /* TODO: Remove filters
    initFilters() {
        if (this.wavesurfer) {
            this.filterFade = this.wavesurfer.backend.ac.createGain();
            this.filterGain = this.wavesurfer.backend.ac.createGain();

            this.filterCompressor = this.wavesurfer.backend.ac.createDynamicsCompressor();
            this.filterCompressor.threshold.value = -50;
            this.filterCompressor.knee.value = 30.0;
            this.filterCompressor.ratio.value = 5.0;
            this.filterCompressor.attack.value = 0.020; // 20ms
            this.filterCompressor.release.value = 0.050; // 50ms

            this.filterBiquad = this.wavesurfer.backend.ac.createBiquadFilter();
        }
    }

    async updateFilters() {
        if (this.wavesurfer) {
            await tick();
            this.activeFilters = [];

            // 1. gain
            if (this.volumeNormalizationEnabled && this.gainType !== "None") {
                this.activeFilters.push(this.filterGain);
            }

            // 2. dynamics compressor
            if (this.dynamicsCompressorEnabled) {
                this.activeFilters.push(this.filterCompressor);
            }

            // 3. fade
            this.activeFilters.push(this.filterFade);

            // last. biquad (for testing only)
            // this.activeFilters.push(this.filterBiquad);

            debugHelper(this.activeFilters, 'Active filters');

            // finally, apply any filters
            this.wavesurfer.backend.setFilters(this.activeFilters);

            // redraw waveform regardless
            this.wavesurfer.drawBuffer();
        }
    }
    */

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
            this.howl = new Howl({
                src: [this.currentMedia.url],
                format: [this.currentMedia.stream_format],
                html5: true
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

                navigator.mediaSession.setActionHandler('play', function () {
                    self.playPause();
                });
                navigator.mediaSession.setActionHandler('pause', function () {
                    self.playPause();
                });
                navigator.mediaSession.setActionHandler('stop', function () {
                    self.stop();
                });
                navigator.mediaSession.setActionHandler('nexttrack', function () {
                    self.next();
                });
                navigator.mediaSession.setActionHandler('previoustrack', function () {
                    self.previous();
                });
            }

            /* TODO: Remove filters
            this.initFilters();
            this.filterGain.gain.value = this.calculateGain();
            */
            this.howl.volume(this.globalVolume);

            //await this.updateFilters();

            // Start playing once loaded
            this.howl.once('load', function(){
                debugHelper('Howl loaded');
                this.howl.play();
            }.bind(this));

            this.howl.on('play', function() {
                debugHelper('Howl playing');
                IsPlaying.set(true);
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

            this.howl.on('volume', function() {
                debugHelper(`Howl volume updated: ${this.howl.volume()}`);
                self.globalVolume = this.howl.volume();
            }.bind(this));

            this.howl.on('playerror', function(e) {
                debugHelper('Howl play error', e);

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

        setTimeout(() => {
            this.updateCurrentTime();
        }, 100);
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
                await this.fadeIn();
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
        this.setQueueItems(songs).then(() => {
            this.start();
        });
    }

    /**
     * Insert songs after currently playing song
     * @param {object} songs
     */
    async playNext(songs) {
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

    async fadeIn() {
        /* TODO: Replace or remove
        this.filterFade.gain.setValueAtTime(0.01, this.filterFade.context.currentTime);
        this.filterFade.gain.exponentialRampToValueAtTime(1, this.filterFade.context.currentTime + 0.5);
        */
    }

    async fadeOut() {
        /* TODO: Replace or remove
        this.filterFade.gain.setValueAtTime(1, this.filterFade.context.currentTime);
        this.filterFade.gain.exponentialRampToValueAtTime(0.01, this.filterFade.context.currentTime + 0.3);
        await sleep(300); // wait for fade to end before continuing
        */
    }

    /**
     * Calculate gain (R128 & ReplayGain)
     * @returns {number} gainLevel
     */
    calculateGain() {
        // defaults
        let gainLevel = 0;
        let replayGain = 0;

        this.masteredVolume = 0;
        this.gainNeeded = 0;

        let r128_track_gain = (this.currentMedia.r128_track_gain !== null) ? this.currentMedia.r128_track_gain.toString() : null;
        let rg_track_gain = (this.currentMedia.replaygain_track_gain !== null) ? this.currentMedia.replaygain_track_gain.toString() : null;

        if (r128_track_gain !== null) { // R128 PREFERRED
            this.gainType = 'EBU R128';

            replayGain = parseInt(r128_track_gain / 256); // LU/dB away from baseline of -23 LUFS/dB, stored as Q7.8 (2 ^ 8) https://datatracker.ietf.org/doc/html/rfc7845.html#section-5.2.1
            const referenceLevel = parseInt(-23); // LUFS https://en.wikipedia.org/wiki/EBU_R_128#Specification
            let masteredVolume = referenceLevel - replayGain;
            let difference = this.targetVolume - masteredVolume;

            gainLevel = difference;

            this.masteredVolume = masteredVolume;
            this.gainNeeded = gainLevel.toFixed(2);

            gainLevel = Math.pow(10, (gainLevel / 20));
        } else if (rg_track_gain !== null) { // Replay Gain fallback
            this.gainType = 'ReplayGain';

            replayGain = parseFloat(rg_track_gain);
            this.gainTagValue = replayGain;

            gainLevel = replayGain;

            this.gainNeeded = gainLevel.toFixed(2);

            gainLevel = Math.pow(10, (gainLevel / 20));
        } else {
            this.gainType = 'None';
        }

        return gainLevel;
    }
}

export default Player;