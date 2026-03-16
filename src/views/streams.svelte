<script>
    import { _ } from 'svelte-i18n';
    import { API } from "../stores/api";
    import { PageTitle } from "../stores/status";
    import Lister from '../components/lister/lister.svelte';

    let title = $_('text.streams');
    $PageTitle = title;
</script>

<svelte:head>
    <title>{$_('text.ample') + ' :: ' + title}</title>
</svelte:head>

<div class="page-main">
    {#await $API.liveStreams()}
        <p>{$_('text.loading')}</p>
    {:then streams}
        {#if streams.length > 0}
            <Lister
                data={streams}
                type="stream"
                initialSort="name"
                virtualList={true}
                actionData={{
                    type: "stream",
                    data: Object.create({songs: streams})
                }}
            />
        {:else}
            <p>{$_('text.noItemsFound')}</p>
        {/if}
    {:catch error}
        <p>{$_('text.errorGeneric')}</p>
    {/await}
</div>