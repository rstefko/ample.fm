<script>
    import { CurrentMedia } from "../../stores/status";

    import { formatSongLength } from "../../logic/helper";
</script>

{#if $CurrentMedia}
    {formatSongLength($CurrentMedia.time)}
{:else}
    -:--
{/if}