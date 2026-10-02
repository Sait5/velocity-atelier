<script setup lang="ts">
const emit=defineEmits<{close:[]}>(),dialog=ref<HTMLDialogElement>();const {t}=useLocale()
onMounted(()=>dialog.value?.showModal())
</script>
<template><dialog ref="dialog" class="modal" @cancel.prevent="emit('close')" @click="($event.target===dialog)&&emit('close')"><button class="close" @click="emit('close')" :aria-label="t('Закрыть окно','Close dialog')">×</button><slot /></dialog></template>
