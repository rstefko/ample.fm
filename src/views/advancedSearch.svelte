<script>
    import { _ } from 'svelte-i18n';
    import CustomSearch from '../components/customSearch.svelte';
    import CustomSearchResults from '../components/customSearchResults.svelte';
    import { PageTitle } from "../stores/status";

    let loadedTime;
    let loading;
    let results = [];
    let type;

    let title = $_('text.advancedSearch');
    $PageTitle = title;
</script>

<svelte:head>
    <title>{$_('text.ample') + ' :: ' + title}</title>
</svelte:head>

<CustomSearch bind:results bind:loadedTime bind:loading bind:selectedObjectType={type} />

<div class="page-main">
    <CustomSearchResults bind:results bind:loadedTime bind:loading bind:type />
</div>