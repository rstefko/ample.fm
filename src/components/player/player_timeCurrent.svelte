<script>
    import { CurrentMedia, TimeToggled, CurrentTime } from "../../stores/status";

    import { formatSongLength } from "../../logic/helper";

    function handleTimeToggle() {
        $TimeToggled = !$TimeToggled;
    }
</script>

{#if $CurrentMedia}
    <span class="current" on:click={handleTimeToggle}>
        {#if $TimeToggled}
            -{formatSongLength($CurrentMedia.time - $CurrentTime)}
        {:else}
            {formatSongLength($CurrentTime)}
        {/if}
    </span>
{:else}
    -:--
{/if}