<script>
    import { _ } from 'svelte-i18n';
    import Actions from '../../components/action/actions.svelte';
    import PlaylistArt from '../../components/playlist/playlist_art.svelte';

    export let data = null; // needed for cardList dynamic components

    let stream;

    $: stream = data;
</script>

<div class="stream-card card">
    {#if stream}
        <div class="top">
            <div class="title">
                {stream.name}
            </div>
        </div>

        <div class="image-container">
            <PlaylistArt fallback="{stream.art}" />
        </div>

        <div class="details">
            <div class="actions">
                <Actions
                    type="stream"
                    mode="miniButtons"
                    id="{stream.id}"
                    data={Object.create({song: stream})}
                />
            </div>
        </div>
    {:else}
        <div class="top">
            <div class="title">
                {$_('text.loading')}
            </div>
        </div>

        <div class="image-container">
            <PlaylistArt fallback="{stream.art}" />
        </div>


        <div class="details">
            <div class="actions">
                <Actions type="stream" mode="miniButtons" />
            </div>
        </div>
    {/if}
</div>

<style>
    /* Stream grids should have this on the containing element */
    :global(.stream-grid) {
        column-gap: var(--spacing-lg);
        row-gap: var(--spacing-xl);
        grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    }

    :global(.stream-scroll) .stream-card {
        width: 220px;
    }

    :global(.stream-card) {
        height: 100%; /* equal height with siblings */
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
    }

    :global(.highlight .stream-card) {
        border: 2px solid var(--color-highlight);
    }

    .image-container {
        overflow: hidden;
        position: relative;
    }

    .image-container :global(a) {
        display: flex; /* white space removal */
    }

    .details {
        padding: var(--spacing-md);
        padding-block-end: 0;
        text-align: center;
    }

    .title {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: center;
    }

    .title :global(a) {
        display: block;
        padding: var(--spacing-md);
        font-size: 16px;
    }

    .actions {
        display: flex;
        justify-content: center;
    }
</style>