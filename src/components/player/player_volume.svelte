<script>
    import { _ } from 'svelte-i18n';
    import { tick } from 'svelte';
    import { v4 as uuidv4 } from 'uuid';
    import {
        CurrentMedia,
        IsMuted,
        NowPlayingQueue,
        VolumeNormalizationEnabled,
        DynamicsCompressorEnabled
    } from "../../stores/status";
    import { MediaPlayer } from "../../stores/player";
    import { debugMode } from "../../stores/server";

    import Menu from '../../components/menu.svelte';

    import PlayerVolumeSlider from './player_volumeSlider.svelte';

    import SVGVolumeUp from "/src/images/volume_up.svg";
    import SVGVolumeMuted from "/src/images/volume_off.svg";
    import SVGTune from "/src/images/tune.svg";

    const uniqueMenuID = "volumeMenu_" + uuidv4();

    let menuIsVisible = false;

    function toggleMenu() {
        menuIsVisible = !menuIsVisible;
    }

    async function handleMuteToggle() {
        if ($MediaPlayer.howl) {
            IsMuted.set(!$IsMuted);
            await tick();
            $MediaPlayer.howl.mute($MediaPlayer.isMuted);
        }
    }

    function handleVolumeNormalize() {
        let inverted = !$VolumeNormalizationEnabled;
        localStorage.setItem('AmpleVolumeNormalizationEnabled', JSON.stringify(inverted));
        VolumeNormalizationEnabled.set(inverted);
        $MediaPlayer.updateFilters();
    }

    function handleDynamicsCompressor() {
        let inverted = !$DynamicsCompressorEnabled;
        localStorage.setItem('AmpleDynamicsCompressorEnabled', JSON.stringify(inverted));
        DynamicsCompressorEnabled.set(inverted);
        $MediaPlayer.updateFilters();
    }

    function handleCompressorThreshold() {
        $MediaPlayer.filterCompressor.threshold.value = this.value;
    }

    function handleCompressorRatio() {
        $MediaPlayer.filterCompressor.ratio.value = this.value;
    }

    function handleCompressorKnee() {
        $MediaPlayer.filterCompressor.knee.value = this.value;
    }

    function handleCompressorAttack() {
        $MediaPlayer.filterCompressor.attack.value = this.value;
    }

    function handleCompressorRelease() {
        $MediaPlayer.filterCompressor.release.value = this.value;
    }
</script>

<button
    class="icon-button volume-control"
    on:click={handleMuteToggle}
    disabled={$NowPlayingQueue.length === 0}
    title="{$IsMuted ? $_('text.volumeUnmute') : $_('text.volumeMute')}"
>
    {#if $IsMuted}
        <SVGVolumeMuted />
    {:else}
        <SVGVolumeUp />
    {/if}
</button>

<PlayerVolumeSlider />

<button
    id={uniqueMenuID}
    class="icon-button"
    title="{$_('text.volumeSettings')}"
    on:click={toggleMenu}
>
    <SVGTune style="padding: 0.15em;" />
</button>

{#if menuIsVisible}
    <Menu anchor="top" toggleSelector={`#${uniqueMenuID}`} bind:isVisible={menuIsVisible} >
        <div class="header new-panel-header">
            <h4 class="title panel-title">{$_('text.volumeSettings')}</h4>
        </div>

        <div class="panel-content">
            <div class="group">
                <PlayerVolumeSlider />

                <label class="toggle">
                    <input type="checkbox" on:change={handleVolumeNormalize} bind:checked={$VolumeNormalizationEnabled} />
                    {$_('text.volumeNormalize')}
                </label>

                <div class="info">{$_('text.volumeNormalizeInfo')}</div>

                {#if $CurrentMedia}
                    <div class="current new-panel-main">
                        <table>
                            <tr>
                                <td class="label">{$_('text.current')}</td>
                                <td>{$MediaPlayer.gainType}</td>
                            </tr>

                            {#if $MediaPlayer.gainType === 'EBU R128'}
                                <tr>
                                    <td class="label">{$_('text.target')}</td>
                                    <td>{$MediaPlayer.targetVolume}db</td>
                                </tr>

                                <tr>
                                    <td class="label">{$_('text.mastered')}</td>
                                    <td>{$MediaPlayer.masteredVolume}db</td>
                                </tr>
                            {/if}

                            {#if $MediaPlayer.gainType === 'ReplayGain'}
                                <tr>
                                    <td class="label">{$_('text.replaygain')}</td>
                                    <td>{$MediaPlayer.gainTagValue}</td>
                                </tr>
                            {/if}

                            <tr>
                                <td class="label">{$_('text.gain')}</td>
                                <td>{$MediaPlayer.gainNeeded}db</td>
                            </tr>
                        </table>

                    </div>
                {/if}
            </div>

            <div class="group">
                <label class="toggle">
                    <input type="checkbox" on:change={handleDynamicsCompressor} bind:checked={$DynamicsCompressorEnabled} />
                    {$_('text.volumeNightMode')}
                </label>

                <div class="info">{$_('text.volumeNightModeInfo')}</div>

                {#if $debugMode && $MediaPlayer.filterCompressor}
                    <div class="menu-separator"></div>

                    <div class="overrides">
                        <label>
                            Threshold <span id="compressor_threshold_value">{$MediaPlayer.filterCompressor.threshold.value}</span>
                            <input type="range" min="-100" max="0" value={$MediaPlayer.filterCompressor.threshold.value} on:input={handleCompressorThreshold}>
                        </label>

                        <label>
                            Ratio <span id="compressor_ratio_value">{$MediaPlayer.filterCompressor.ratio.value}</span>
                            <input type="range" min="1" max="20" value={$MediaPlayer.filterCompressor.ratio.value} on:input={handleCompressorRatio}>
                        </label>

                        <label>
                            Knee <span id="compressor_knee_value">{$MediaPlayer.filterCompressor.knee.value}</span>
                            <input type="range" min="0" max="40" value={$MediaPlayer.filterCompressor.knee.value} on:input={handleCompressorKnee}>
                        </label>

                        <label>
                            Attack <span id="compressor_attack_value">{$MediaPlayer.filterCompressor.attack.value}</span>
                            <input type="range" min="0" max="1" value={$MediaPlayer.filterCompressor.attack.value} step="0.001" on:input={handleCompressorAttack}>
                        </label>

                        <label>
                            Release <span id="compressor_release_value">{$MediaPlayer.filterCompressor.release.value}</span>
                            <input type="range" min="0" max="1" value={$MediaPlayer.filterCompressor.release.value} step="0.001" on:input={handleCompressorRelease}>
                        </label>
                    </div>

                {/if}
            </div>
        </div>
    </Menu>
{/if}

<style>
    .overrides :global(label) {
        margin-block-start: var(--spacing-md);
        display: block;
    }

    .overrides label > input {
        margin-block-start: var(--spacing-sm);
        display: block;
    }

    .group + .group {
        padding-block-start: var(--spacing-lg);
    }

    .current {
        max-width: fit-content;
        margin-block-start: var(--spacing-md);
    }

    .label {
        color: var(--color-text-secondary);
        padding-inline-end: var(--spacing-md);
        text-align: end;
    }
</style>