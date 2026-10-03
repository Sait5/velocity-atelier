<script setup lang="ts">
defineProps<{kind:'door'|'seat'|'lamp'}>()
</script>
<template><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><template v-if="kind==='door'"><path d="M5 20V5l11-2 3 4v13H5Z"/><path d="M8 7v5h8V6M15 16h2"/></template><template v-else-if="kind==='seat'"><path d="M7 3h4v8l4 3h4v4H8l-3-5V5l2-2ZM8 18l-1 3m10-3 1 3"/></template><template v-else><path d="M13 5c-5 0-8 3-8 7s3 7 8 7V5ZM17 6h4m-4 4h4m-4 4h4m-4 4h4"/></template></svg></template>
