export function useLocale(){const {language}=useAtelier();return {language,t:(ru:string,en:string)=>language.value==='ru'?ru:en}}
