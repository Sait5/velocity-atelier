<script setup lang="ts">
defineProps<{kind:'door'|'seat'|'lamp'|'window'}>()
</script>
<template><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><template v-if="kind==='door'"><path d="M5 20V5l11-2 3 4v13H5Z"/><path d="M8 7v5h8V6M15 16h2"/></template><template v-else-if="kind==='seat'"><rect x="7.5" y="3" width="5" height="4" rx="1.5"/><path d="M7.5 9H12l1 6h5a2 2 0 0 1 2 2v2H9a3 3 0 0 1-3-3V11a2 2 0 0 1 1.5-2ZM9 19l-1 2m9-2 1 2"/></template><template v-else-if="kind==='window'"><path d="M5 18V8l5-4h9v14H5Z"/><path d="M9 14h6m-3-3v6m-2-2 2 2 2-2"/></template><template v-else><path d="M13 5c-5 0-8 3-8 7s3 7 8 7V5ZM17 6h4m-4 4h4m-4 4h4m-4 4h4"/></template></svg></template>
