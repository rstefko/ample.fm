<script>
    import { _ } from 'svelte-i18n';
    import { PageTitle } from "../stores/status";
    import { randomArtists } from "../logic/artist";
    import { randomAlbums } from "../logic/album";
    import { randomSongs } from "../logic/song";
    import Lister from '../components/lister/lister.svelte';
    import Tabs from "../components/tabs/tabs.svelte";
    import Tab from "../components/tabs/tab.svelte";
    
    import SVGArtist from "/src/images/artist.svg";
    import SVGAlbum from "/src/images/album.svg";
    import SVGSong from "/src/images/music_note.svg";

    // List of tab items with labels and values.
    let tabItems = [
        { label: $_('text.artists'), value: "artists", icon: SVGArtist },
        { label: $_('text.albums'),  value: "albums",  icon: SVGAlbum },
        { label: $_('text.songs'),   value: "songs",   icon: SVGSong },
    ];

    let currentTab;

    let title = $_('text.random');
    $PageTitle = title;
</script>

<svelte:head>
    <title>{$_('text.ample') + ' :: ' + title}</title>
</svelte:head>

<Tabs bind:activeTabValue={currentTab} bind:items={tabItems} id="random">
    {#each tabItems as tab}
        {#if tab.loaded === true}
            {#if tab.value === 'artists'}
                <Tab id="artists" class="artists" bind:activeTabValue={currentTab}>
                    {#await randomArtists({limit: 50})}
                        {$_('text.loading')}
                    {:then artists}
                        {#if artists.length > 0}
                            <Lister
                                data={artists}
                                type="artist"
                                virtualList={true}
                                actionData={{
                                    type: "artists",
                                    mode: "fullButtons",
                                    showShuffle: artists.length > 1,
                                    data: Object.create({artists: artists})
                                }}
                            />
                        {:else}
                            <p>{$_('text.noItemsFound')}</p>
                        {/if}
                    {:catch error}
                        <p>{$_('text.errorGeneric')}</p>
                    {/await}
                </Tab>
            {/if}

            {#if tab.value === 'albums'}
                <Tab id="albums" class="albums" bind:activeTabValue={currentTab}>
                    {#await randomAlbums({limit: 50})}
                        {$_('text.loading')}
                    {:then albums}
                        {#if albums.length > 0}
                            <Lister
                                data={albums}
                                type="album"
                                virtualList={true}
                                actionData={{
                                    type: "albums",
                                    mode: "fullButtons",
                                    showShuffle: albums.length > 1,
                                    data: Object.create({albums: albums})
                                }}
                            />
                        {:else}
                            <p>{$_('text.noItemsFound')}</p>
                        {/if}
                    {:catch error}
                        <p>{$_('text.errorGeneric')}</p>
                    {/await}
                </Tab>
            {/if}

            {#if tab.value === 'songs'}
                <Tab id="songs" class="songs" bind:activeTabValue={currentTab}>
                    {#await randomSongs({limit: 50})}
                        {$_('text.loading')}
                    {:then songs}
                        {#if songs.length > 0}
                            <Lister
                                data={songs}
                                type="song"
                                virtualList={true}
                                actionData={{
                                    type: "",
                                    mode: "fullButtons",
                                    showShuffle: songs.length > 1,
                                    data: Object.create({songs: songs})
                                }}
                            />
                        {:else}
                            <p>{$_('text.noItemsFound')}</p>
                        {/if}
                    {:catch error}
                        <p>{$_('text.errorGeneric')}</p>
                    {/await}
                </Tab>
            {/if}
        {/if}
    {/each}
</Tabs>