import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '../store/theme';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { toggle } = useThemeStore();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Don't handle if meta/ctrl keys are pressed (browser shortcuts)
      if (event.metaKey || event.ctrlKey) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case '/':
          event.preventDefault();
          const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
          searchInput?.focus();
          break;
        case 'p':
          navigate('/ports');
          break;
        case 's':
          navigate('/services');
          break;
        case 'c':
          navigate('/containers');
          break;
        case 'd':
          toggle();
          break;
        case 'r':
          // Refresh - the WebSocket handles real-time updates
          window.location.reload();
          break;
        case 'escape':
          // Close any open modals
          const closeButton = document.querySelector<HTMLButtonElement>('[data-close-modal]');
          closeButton?.click();
          break;
        case '?':
          // Show help - could open a modal
          console.log('Keyboard shortcuts: / p s c d r Esc ?');
          break;
        case 'h':
          navigate('/');
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, toggle]);
}
