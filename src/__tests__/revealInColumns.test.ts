import { revealInColumns } from '../helpers/revealInColumns';
import { useStore } from '../store';

// Mock electronAPI
(global as any).electronAPI = {
  stat: jest.fn(),
};

describe('revealInColumns helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).electronAPI.stat.mockClear();
    useStore.setState({
      activePane: 'left',
      panes: [
        {
          id: 'left',
          viewMode: 'column',
        } as any,
      ],
      setViewMode: jest.fn(),
      setRevealTarget: jest.fn().mockResolvedValue(undefined),
    });
  });

  test('calls setRevealTarget with correct parameters', async () => {
    await revealInColumns('/Users/john/file.txt', 'left');

    const store = useStore.getState();
    expect(store.setRevealTarget).toHaveBeenCalledWith({
      paneId: 'left',
      filePath: '/Users/john/file.txt',
    });
  });

  test('switches to column view if needed', async () => {
    useStore.setState({
      activePane: 'left',
      panes: [
        {
          id: 'left',
          viewMode: 'list',
        } as any,
      ],
      setViewMode: jest.fn(),
      setRevealTarget: jest.fn().mockResolvedValue(undefined),
    });

    await revealInColumns('/Users/john/file.txt', 'left');

    const store = useStore.getState();
    expect(store.setViewMode).toHaveBeenCalledWith('left', 'column');
  });
});
