<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import MouseTrap from "mousetrap";

    export let enabled = true;
    export let hotKeys: {
        keys: string;
        event: string;
    }[] = [
        {
            keys: "ctrl+.",
            event: "nextreplica"
        },
        {
            keys: "ctrl+,",
            event: "prevreplica"
        },
        {
            keys: "shift+s",
            event: "toggledualsubs"
        }
    ];

    const dispatch = createEventDispatcher();

    const bindKeys = () => {
        hotKeys.forEach(item => {
            MouseTrap.bind(item.keys, function(e) {
                e.preventDefault();
                dispatch(item.event);
            });
        });
    };

    const unbindKeys = () => {
        hotKeys.forEach(item => MouseTrap.unbind(item.keys));
    };

    $: {
        if (enabled) {
            bindKeys();
        } else {
            unbindKeys();
        }
    }

    onMount(() => {
        if (enabled) {
            bindKeys();
        }
    });

    onDestroy(() => {
        unbindKeys();
    });
</script>
