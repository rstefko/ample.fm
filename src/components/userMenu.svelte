<script>
    import { _ } from 'svelte-i18n';
    import { logout } from "../logic/user";
    import { isLoggedIn } from "../stores/user.js";
    import { ampleVersion, MediaPlayer } from "../stores/player";
    import ThemeToggle from '../components/themeToggle.svelte';
    import LanguageSelector from '../components/languageSelector.svelte';
    import Menu from '../components/menu.svelte';
    import SVGLogout from "/src/images/logout.svg";
    import SVGProfile from "/src/images/account_circle.svg";
    import ClearCache from "/src/images/clear_cache.svg";


    let menuIsVisible = false;

    function toggleMenu() {
        menuIsVisible = !menuIsVisible;
    }

    function handleLogOut() {
        logout();
    }

    function clearCache() {
        $MediaPlayer.clearCache();
    }
</script>

<button id="userMenu-toggle" class="icon-button userMenu-toggle" on:click={toggleMenu}>
    <SVGProfile />
</button>

{#if menuIsVisible}
    <Menu anchor="bottom" toggleSelector={"#userMenu-toggle"} bind:isVisible={menuIsVisible}>
        <div class="new-panel-header">
            {$_('text.ample')} <a href="https://github.com/rstefko/ample.fm/blob/master/CHANGELOG.md" target="_blank">v{$ampleVersion}</a>
        </div>
        <div class="container">
            {#if $isLoggedIn}
                <button
                        on:click={handleLogOut}
                        class="visuallyLink logout"
                        title="{$_('text.logOut')}"
                >
                    <SVGLogout />
                    <span class="text">{$_('text.logOut')}</span>
                </button>
            {/if}

            <button
                    on:click={clearCache}
                    class="visuallyLink clear-cache"
                    title="{$_('text.clearCache')}"
            >
                <ClearCache />
                <span class="text">{$_('text.clearCache')}</span>
            </button>

            <ThemeToggle />

            <LanguageSelector />
        </div>
    </Menu>
{/if}

<style>
    .container {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-md);
    }

    .container :global(svg) {
        height: 1.5em;
        width: auto;
        color: var(--color-highlight);
    }

    .container :global(button),
    .container :global(a) {
        display: flex;
        gap: var(--spacing-sm);
    }

    .container :global(.theme-toggle) {
        background-color: transparent;
        padding: 0;
        font-weight: normal;
        color: inherit;
    }

    .userMenu-toggle {
        margin-inline-end: var(--spacing-sm);
    }
</style>