<script lang="ts">
    import { createEventDispatcher, onDestroy, onMount } from "svelte";
    import MouseTrap from "mousetrap";

    export let enabled = true;
    export let nextReplicaHotKeys = "ctrl+.";
    export let prevReplicaHotKeys = "ctrl+,";
 
    console.log("Next replica hotkey", nextReplicaHotKeys);
    console.log("Prev replica hotkey", prevReplicaHotKeys);

    const dispatch = createEventDispatcher();

    const bindKeys = () => {
        MouseTrap.bind(nextReplicaHotKeys, function(e) {
            e.preventDefault();
            dispatch("nextreplica");
        });

        MouseTrap.bind(prevReplicaHotKeys, function(e) {
            e.preventDefault();
            dispatch("prevreplica");
        });
    }

    const unbindKeys = () => {
        MouseTrap.unbind(nextReplicaHotKeys);
        MouseTrap.unbind(prevReplicaHotKeys);
    }

    $: {
        if (enabled) {
            bindKeys()
        } else {
            unbindKeys()
        }
    }

    onMount(() => {
        if (enabled) {
            bindKeys()
        }
    });
    
    onDestroy(() => {
        unbindKeys();
    });

</script>
