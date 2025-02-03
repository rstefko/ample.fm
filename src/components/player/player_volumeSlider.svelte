<script>
    import {
        PlayerVolume
    } from "../../stores/status";

    let volumeWidth = $PlayerVolume; // volume in this file is treated as a linear 0-100 value
    let mouseDown = false;
    let volumeSlider;

    function handleVolumeSlider(event) {
        let volumeElementWidth = event.target.offsetWidth;
        let volumeClickLocation = event.clientX - event.target.getBoundingClientRect().left;
        let volumeFraction = volumeClickLocation / volumeElementWidth;
        volumeWidth = (volumeFraction * 100);
        volumeWidth = (volumeWidth > 100) ? 100 : volumeWidth;
        volumeWidth = (volumeWidth < 0) ? 0 : volumeWidth;

        PlayerVolume.set(volumeWidth);
    }

    function handleVolumeMouseDown(event) {
        mouseDown = true;
        document.addEventListener('mouseup', handleVolumeMouseUp);
        volumeSlider?.classList.add("dragging");
    }

    function handleVolumeMouseUp(event) {
        mouseDown = false;
        document.removeEventListener('mouseup', handleVolumeMouseUp);
        volumeSlider?.classList.remove("dragging");
    }

    function handleVolumeDrag(event) {
        if (mouseDown) {
            requestAnimationFrame(function() {
                handleVolumeSlider(event);
            });
        }
    }
</script>
<div
    class="site-player__volume-slider volume-control"
    on:click={handleVolumeSlider}
    on:mousedown={handleVolumeMouseDown}
    on:mousemove={handleVolumeDrag}
    bind:this={volumeSlider}
>
    <span class="site-player__volume-value" data-value="{Math.floor(volumeWidth)}" style="width: {volumeWidth}%">
    </span>
</div>

<style>
    .site-player__volume-slider {
        background-color: var(--color-border);
        display: flex;
        height: 4px;
        width: 100%;
        min-width: 100px;
        cursor: pointer;
        position: relative;
        border-radius: 100vh;
        justify-self: center;
        margin: 10px;
    }

    /* increase clickable area of volume */
    .site-player__volume-slider:after {
        content: '';
        height: 30px;
        background-color: transparent;
        width: calc(100% + 30px);
        display: block;
        position: absolute;
        opacity: 0;
        inset-block-start: 50%;
        inset-inline-start: 50%;
        transform: translateY(-50%) translateX(-50%);
        z-index: 100;
    }

    .site-player__volume-value {
        background-color: var(--color-highlight);
        position: absolute;
        inset-inline-start: 0;
        inset-block-end: 0;
        inset-block-start: 0;
        transition: width linear 200ms;
        border-radius: 100vh;
    }

    /* volume value indicator popup */
    .site-player__volume-value:before {
        opacity: 0;
        inset-block-start: calc(50% - 20px);
    }
</style>