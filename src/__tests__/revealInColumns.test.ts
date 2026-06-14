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

});
