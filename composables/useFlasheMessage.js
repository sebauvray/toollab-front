import { ref } from 'vue'

const flashMessage = ref(null)

export function useFlashMessage() {
    const setFlashMessage = (message) => {
        flashMessage.value = message
    }

    const clearFlashMessage = () => {
        flashMessage.value = null
    }

    return {
        flashMessage,
        setFlashMessage,
        clearFlashMessage
    }
}