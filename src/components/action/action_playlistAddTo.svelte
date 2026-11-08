<script>
    import { _ } from 'svelte-i18n';
    import { getContext, tick } from 'svelte';
    import Menu from '../../components/menu.svelte';
    import PlaylistAddTo from '../../components/playlist/playlist_addTo.svelte';
    import { loadingSpinner } from '../../actions/loadingSpinner';
    import SVGPlaylist from "/src/images/queue_music.svg";

    export let contextKey;

    const { getType, getMode, getID, getSongs } = getContext(contextKey);

    let loaded = false;
    let menuIsVisible = false;
    let type = getType();
    let mode = getMode();
    let id = getID();
    let songsForPlaylistAdd = [];

    async function handleAction() {
        loaded = false;
        
        try {
            songsForPlaylistAdd = await getSongs();
            
            if (songsForPlaylistAdd.length > 0) {
                menuIsVisible = !menuIsVisible;
            }
        } finally {
            loaded = true;
        }
    }
</script>

<button
    type="button"
    id="js-action-playlist_add_{type}{mode}{id}"
    on:click={handleAction}
    title="{$_('text.playlistAddTo')}"
    use:loadingSpinner={loaded}
>
    <SVGPlaylist />
</button>

{#if menuIsVisible}
    <Menu anchor="left" toggleSelector={"#js-action-playlist_add_" + type + mode + id} bind:isVisible={menuIsVisible}>
        <PlaylistAddTo bind:songs={songsForPlaylistAdd} bind:isVisible={menuIsVisible} />
    </Menu>
{/if}