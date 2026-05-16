import { useStore } from '../store';

/**
 * Reveal a file/directory in column view.
 * This is a reusable helper used by SearchOverlay, TagManagerModal, and other modals.
 *
 * @param filePath - The full path to the file/directory to reveal
 * @param paneId - The pane ID to reveal in
 * @param onClose - Optional callback to close the modal/overlay after setting reveal target
 */
export async function revealInColumns(
  filePath: string,
  paneId?: string,
  onClose?: () => void
): Promise<void> {
  const state = useStore.getState();
  const activePaneId = paneId || state.activePane;
  const pane = state.panes.find((p: any) => p.id === activePaneId);
  if (!pane) return;

  if (pane.viewMode !== 'column') {
    state.setViewMode(activePaneId, 'column');
  }

  await state.setRevealTarget({
    paneId: activePaneId,
    filePath,
  });

  if (onClose) {
    onClose();
  }
}
