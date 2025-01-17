import { readable, writable } from "svelte/store";
import Player from "../logic/player";
import {version} from '../../package.json';

export let ampleVersion = readable(version);

export let MediaPlayer = writable(new Player());

export let SiteInnerBind = writable();
export let SiteContentBind = writable();
export let SiteSidebarBind = writable();
export let SiteQueueBind = writable();
