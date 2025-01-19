<script>
    import { _ } from 'svelte-i18n';
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import { lchToRgb } from 'color-converters';
    import AmpacheAPI from 'javascript-ampache';
    import { API } from "../stores/api.js";
    import { serverVersion, serverURL, serverIsHardcoded } from "../stores/server";
    import { PageTitle, Theme } from "../stores/status";
    import { ampleVersion } from "../stores/player";

    import { loginNew } from '../logic/user';
    import { getRandomInt } from '../logic/helper';
    import { setCustomHue } from '../logic/color';
    import { getServerVersion } from '../logic/server.js';

    import Tabs from "../components/tabs/tabs.svelte";
    import Tab from "../components/tabs/tab.svelte";
    import UserMenu from '../components/userMenu.svelte';

    import SVGAmpleLogo from "/src/images/ample_logo.svg";
    import SVGLogin from "/src/images/login.svg";

    let theme;
    let versionCheck;
    let username = "";
    let password = "";
    let serverDomain = $serverURL ? new URL($serverURL).host : "";
    let randomColor = lchToRgb([50, 50, getRandomInt(360)]);
    let result;

    let fatalError = false;

    let title = $_('text.login');
    $PageTitle = title;

    $: theme = $Theme;

    $: versionCheck = $serverVersion.charAt(0);

    // save server URL in localstorage
    $: $serverURL, localStorage.setItem('AmpleServerURL', JSON.stringify($serverURL));

    const handleSubmitUsername = async (e) => {
        setServerDetails();

        try {
            result = await loginNew({ passphrase: password, username: username });
        } catch (e) {
            fatalError = true;
        }
    }

    function setServerDetails() {
        fatalError = false;
        $serverURL = 'https://' + serverDomain + '/apps/music/ampache';
        $API = new AmpacheAPI({ url: $serverURL, debug: false })
        getServerVersion();
    }

    onMount(async () => {
        await setCustomHue(randomColor);
    });
</script>

<svelte:head>
    <title>{$_('text.ample') + ' :: ' + title}</title>
</svelte:head>

<div class="container">
    <UserMenu />

    <div class="form" in:fade out:fade>
        {#if versionCheck && versionCheck < 6}
            <p class="server-message badge badge--danger" in:fade>{$_('versionWarning', {values: { serverVersion: $serverVersion }})}</p>
        {/if}

        <div class="logo">
            <SVGAmpleLogo width="336" />
        </div>

        <Tabs>
            <Tab class="username login-tab">
                <form on:submit|preventDefault={handleSubmitUsername}>
                    {#if !$serverIsHardcoded}
                        <p>
                            <label>{$_('text.serverURL')}
                                <input type="text" placeholder="owncloud.example.com" bind:value={serverDomain} />
                            </label>
                        </p>
                    {/if}

                    <p>
                        <label>{$_('text.username')}
                            <input type="text" autofocus bind:value={username} />
                        </label>
                    </p>
                    <p>
                        <label>{$_('text.password')}
                            <input type="password" bind:value={password} />
                        </label>
                    </p>
                    <button class="button button--primary"
                            type="submit"
                            disabled="{!serverDomain || !username || !password}"
                    >
                        <SVGLogin /> {$_('text.login')}
                    </button>
                </form>
            </Tab>
        </Tabs>

        {#if result?.error?.errorMessage}
            <p class="login-message badge badge--warning" in:fade>{result.error.errorMessage}</p>
        {/if}

        {#if fatalError}
            <p class="login-message badge badge--warning" in:fade>{$_('text.errorFatal')}</p>
        {/if}
    </div>

    <div class="meta">
        <span><a href="https://github.com/rstefko/ample.fm">{$_('text.ample')}</a> v{$ampleVersion}. {$_('text.ampleDescription')}</span>
    </div>
</div>

<style>
    .logo {
        color: var(--color-highlight);
        margin-block-end: var(--spacing-xl);
    }

    .container {
        width: 100vw;
        height: 100vh;
        z-index: 10;
    }

    .container :global(.userMenu-toggle) {
        position: absolute;
        inset-block-start: var(--spacing-md);
        inset-inline-end: var(--spacing-md);
        margin: 0;
    }

    .form {
        background-color: var(--color-background); /* cover version details when the mobile keyboard appears */
        position: absolute;
        inset-inline-start: 50%;
        inset-block-start: 50%;
        transform: translateY(-50%) translateX(-50%);
        width: 100%;
        max-width: 400px;
        padding: var(--spacing-xxl);
        z-index: 10;
    }

    label > * {
        margin-block-start: var(--spacing-sm);
    }

    label input {
        display: table;
        width: 100%;
    }

    button {
        margin-block-start: var(--spacing-md);
    }

    .server-message {
        position: absolute;
        inset-block-end: 100%;
        inset-inline-start: 0;
        width: 100%;
    }

    .login-message {
        position: absolute;
        inset-inline-start:  var(--spacing-xxl);
        inset-inline-end: var(--spacing-xxl);
    }

    .meta {
        position: absolute;
        inset-block-end: var(--spacing-lg);
        inset-inline-end: var(--spacing-lg);
        opacity: 0.4;
    }

    /* don't shift layout when tabs change */
    .form :global(.login-tab) {
        min-height: 190px;
    }
</style>