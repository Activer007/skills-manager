import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      // Handle parameterized translations
      if (key === 'importPackageSuccessWithName' && params) {
        return `Skill package imported: ${params.name} (${params.path})`;
      }
      if (key === 'importPackageInvalidWithName' && params) {
        return `Invalid file type: "${params.name}". Please select a .skillpack.zip package`;
      }
      const translations: Record<string, string> = {
        importPackageInvalid: 'Please select a .skillpack.zip package',
        importPackageHint: 'Select an exported .skillpack.zip file',
        selectFile: 'Select File',
        importFromGitHub: 'Import from GitHub',
        importFromLocal: 'Import from Local',
      };
      return translations[key] || key;
    },
    i18n: { language: 'en' },
  }),
  initReactI18next: { type: 'value' },
}));

// Mock hooks
const mockImportPackageMutation = {
  mutateAsync: vi.fn().mockResolvedValue({}),
  isPending: false,
};

vi.mock('../hooks/useSkills', () => ({
  useSkills: () => ({
    data: [
      {
        id: 'test-skill-1',
        name: 'Test Skill 1',
        localPath: '/path/to/skill1',
        description: 'A test skill',
        author: 'Test Author',
        version: '1.0.0',
      }
    ],
    isLoading: false,
    error: null,
  }),
  useUninstallSkill: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useImportSkill: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useImportLocalSkill: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useImportPackageSkill: () => mockImportPackageMutation,
}));

// Mock useNavigate
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// Mock child components
vi.mock('../components/SecurityReportCard', () => ({
  SecurityReportCard: ({ report }: any) => (
    <div data-testid="security-report">Security Report: {report?.level}</div>
  ),
}));

vi.mock('../components/SkillQuality/QualityScoreCard', () => ({
  QualityScoreCard: ({ score }: any) => (
    <div data-testid="quality-score">Quality Score: {score?.total_score || 0}</div>
  ),
}));

vi.mock('../components/common/ModalDialog', () => ({
  ModalDialog: ({ isOpen, children }: any) =>
    isOpen ? <div data-testid="modal-dialog">{children}</div> : null,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Simplified MySkills component for testing package import functionality
function MySkillsPackageImportTest() {
  const [importType, setImportType] = React.useState<string | null>(null);
  const [importPackagePath, setImportPackagePath] = React.useState('');
  const [packageFileError, setPackageFileError] = React.useState<string | null>(null);
  const packageFileInputRef = React.useRef<HTMLInputElement>(null);

  const packagePathTrimmed = importPackagePath.trim();
  const isPackagePathValid = packagePathTrimmed.toLowerCase().endsWith('.skillpack.zip');
  const packagePathError = packageFileError ?? (importType === 'package' && packagePathTrimmed && !isPackagePathValid
    ? 'Please select a .skillpack.zip package'
    : undefined);

  const handleSelectPackageFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const filePath = (file as { path?: string }).path ?? file.name;
    if (!file.name.toLowerCase().endsWith('.skillpack.zip')) {
      setImportPackagePath(filePath);
      setPackageFileError(`Invalid file type: "${file.name}". Please select a .skillpack.zip package`);
      event.target.value = '';
      return;
    }
    setPackageFileError(null);
    setImportPackagePath(filePath);
    event.target.value = '';
  };

  // Extract package file name from path
  const packageFileName = packagePathTrimmed.split(/[\\/]/).pop() || packagePathTrimmed;

  return (
    <div>
      {!importType ? (
        <div>
          <button onClick={() => setImportType('package')} data-testid="select-package-type">
            Import from Package
          </button>
        </div>
      ) : (
        <div>
          <button onClick={() => setImportType(null)} data-testid="go-back">
            Go Back
          </button>
          <div data-testid="package-import-form">
            <input
              ref={packageFileInputRef}
              type="file"
              data-testid="file-input"
              accept=".skillpack.zip,application/zip,application/x-zip-compressed"
              onChange={handleSelectPackageFile}
              className="hidden"
            />
            <button
              onClick={() => packageFileInputRef.current?.click()}
              data-testid="select-file-button"
            >
              Select File
            </button>
            <input
              type="text"
              data-testid="path-input"
              value={importPackagePath}
              onChange={(e) => {
                setImportPackagePath(e.target.value);
                if (packageFileError) {
                  setPackageFileError(null);
                }
              }}
              placeholder="C:\Users\User\Downloads\my-skill.skillpack.zip"
            />
            {packagePathError && (
              <div data-testid="error-message" className="error">
                {packagePathError}
              </div>
            )}
            {packagePathTrimmed && isPackagePathValid && (
              <div data-testid="success-info">
                <div data-testid="package-name">{packageFileName}</div>
                <div data-testid="package-path">{packagePathTrimmed}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';

describe('MySkills - Package Import Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('File Validation', () => {
    it('should accept valid .skillpack.zip file', async () => {
      render(<MySkillsPackageImportTest />);

      // Click to select package import type
      fireEvent.click(screen.getByTestId('select-package-type'));

      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
      const selectFileButton = screen.getByTestId('select-file-button');

      // Create a mock .skillpack.zip file
      const validFile = new File(['content'], 'my-skill.skillpack.zip', {
        type: 'application/zip',
      });
      Object.defineProperty(validFile, 'path', {
        value: '/path/to/my-skill.skillpack.zip',
        configurable: true,
      });

      // Simulate file selection
      await userEvent.click(selectFileButton);
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      // Verify no error is shown
      await waitFor(() => {
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
      });

      // Verify path is updated
      expect(screen.getByTestId('path-input')).toHaveValue('/path/to/my-skill.skillpack.zip');

      // Verify success info is displayed
      expect(screen.getByTestId('package-name')).toHaveTextContent('my-skill.skillpack.zip');
      expect(screen.getByTestId('package-path')).toHaveTextContent('/path/to/my-skill.skillpack.zip');
    });

    it('should reject file with invalid extension', async () => {
      render(<MySkillsPackageImportTest />);

      fireEvent.click(screen.getByTestId('select-package-type'));

      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
      const selectFileButton = screen.getByTestId('select-file-button');

      // Create a mock file with invalid extension
      const invalidFile = new File(['content'], 'document.pdf', {
        type: 'application/pdf',
      });
      Object.defineProperty(invalidFile, 'path', {
        value: '/path/to/document.pdf',
        configurable: true,
      });

      // Simulate file selection
      await userEvent.click(selectFileButton);
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      // Verify error message with file name is shown
      await waitFor(() => {
        const errorMessage = screen.getByTestId('error-message');
        expect(errorMessage).toHaveTextContent('Invalid file type: "document.pdf"');
        expect(errorMessage).toHaveTextContent('Please select a .skillpack.zip package');
      });

      // Verify path is still updated (user can see what they selected)
      expect(screen.getByTestId('path-input')).toHaveValue('/path/to/document.pdf');
    });

    it('should reject .zip file without .skillpack prefix', async () => {
      render(<MySkillsPackageImportTest />);

      fireEvent.click(screen.getByTestId('select-package-type'));

      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
      const selectFileButton = screen.getByTestId('select-file-button');

      // Create a regular .zip file (not .skillpack.zip)
      const regularZipFile = new File(['content'], 'archive.zip', {
        type: 'application/zip',
      });
      Object.defineProperty(regularZipFile, 'path', {
        value: '/path/to/archive.zip',
        configurable: true,
      });

      // Simulate file selection
      await userEvent.click(selectFileButton);
      fireEvent.change(fileInput, { target: { files: [regularZipFile] } });

      // Verify error message
      await waitFor(() => {
        const errorMessage = screen.getByTestId('error-message');
        expect(errorMessage).toHaveTextContent('Invalid file type: "archive.zip"');
      });
    });

    it('should accept file with case-insensitive extension', async () => {
      render(<MySkillsPackageImportTest />);

      fireEvent.click(screen.getByTestId('select-package-type'));

      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
      const selectFileButton = screen.getByTestId('select-file-button');

      // Test uppercase extension
      const uppercaseFile = new File(['content'], 'my-skill.SKILLPACK.ZIP', {
        type: 'application/zip',
      });
      Object.defineProperty(uppercaseFile, 'path', {
        value: '/path/to/my-skill.SKILLPACK.ZIP',
        configurable: true,
      });

      // Simulate file selection
      await userEvent.click(selectFileButton);
      fireEvent.change(fileInput, { target: { files: [uppercaseFile] } });

      // Verify no error
      await waitFor(() => {
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
      });

      // Verify path is updated
      expect(screen.getByTestId('path-input')).toHaveValue('/path/to/my-skill.SKILLPACK.ZIP');
      expect(screen.getByTestId('package-name')).toHaveTextContent('my-skill.SKILLPACK.ZIP');
    });
  });

  describe('Manual Path Input', () => {
    it('should validate manual path input - valid path', async () => {
      render(<MySkillsPackageImportTest />);

      fireEvent.click(screen.getByTestId('select-package-type'));

      const pathInput = screen.getByTestId('path-input');

      // Type valid path
      await userEvent.type(pathInput, 'C:\\Users\\User\\my-skill.skillpack.zip');

      // Verify no error
      await waitFor(() => {
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
      });

      // Verify success info is displayed
      expect(screen.getByTestId('package-name')).toHaveTextContent('my-skill.skillpack.zip');
    });

    it('should validate manual path input - invalid extension', async () => {
      render(<MySkillsPackageImportTest />);

      fireEvent.click(screen.getByTestId('select-package-type'));

      const pathInput = screen.getByTestId('path-input');

      // Type invalid path
      await userEvent.type(pathInput, 'C:\\Users\\User\\document.pdf');

      // Verify error is shown
      await waitFor(() => {
        const errorMessage = screen.getByTestId('error-message');
        expect(errorMessage).toHaveTextContent('Please select a .skillpack.zip package');
      });
    });

    it('should clear error when user starts typing', async () => {
      render(<MySkillsPackageImportTest />);

      fireEvent.click(screen.getByTestId('select-package-type'));

      const pathInput = screen.getByTestId('path-input');

      // Type invalid path to trigger error
      await userEvent.type(pathInput, 'invalid.txt');

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      // Start typing valid content
      await userEvent.clear(pathInput);
      await userEvent.type(pathInput, 'my-skill.skillpack.zip');

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
      });
    });
  });

  describe('File Name Extraction', () => {
    it('should extract file name from Unix path', () => {
      render(<MySkillsPackageImportTest />);

      fireEvent.click(screen.getByTestId('select-package-type'));

      const pathInput = screen.getByTestId('path-input');

      // Type Unix path
      fireEvent.change(pathInput, {
        target: { value: '/home/user/downloads/my-skill.skillpack.zip' }
      });

      expect(screen.getByTestId('package-name')).toHaveTextContent('my-skill.skillpack.zip');
    });

    it('should extract file name from Windows path', () => {
      render(<MySkillsPackageImportTest />);

      fireEvent.click(screen.getByTestId('select-package-type'));

      const pathInput = screen.getByTestId('path-input');

      // Type Windows path
      fireEvent.change(pathInput, {
        target: { value: 'C:\\Users\\User\\Downloads\\my-skill.skillpack.zip' }
      });

      expect(screen.getByTestId('package-name')).toHaveTextContent('my-skill.skillpack.zip');
    });

    it('should handle path without separators', () => {
      render(<MySkillsPackageImportTest />);

      fireEvent.click(screen.getByTestId('select-package-type'));

      const pathInput = screen.getByTestId('path-input');

      // Type just filename
      fireEvent.change(pathInput, {
        target: { value: 'my-skill.skillpack.zip' }
      });

      expect(screen.getByTestId('package-name')).toHaveTextContent('my-skill.skillpack.zip');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty file selection', async () => {
      render(<MySkillsPackageImportTest />);

      fireEvent.click(screen.getByTestId('select-package-type'));

      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
      const selectFileButton = screen.getByTestId('select-file-button');

      // Simulate selecting no file
      await userEvent.click(selectFileButton);
      fireEvent.change(fileInput, { target: { files: [] } });

      // Should not crash or show error
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });

    it('should handle whitespace in path', () => {
      render(<MySkillsPackageImportTest />);

      fireEvent.click(screen.getByTestId('select-package-type'));

      const pathInput = screen.getByTestId('path-input');

      // Type path with leading/trailing whitespace
      fireEvent.change(pathInput, {
        target: { value: '  my-skill.skillpack.zip  ' }
      });

      // Should trim and validate
      expect(screen.getByTestId('package-name')).toHaveTextContent('my-skill.skillpack.zip');
    });

    it('should reset file input after selection', async () => {
      render(<MySkillsPackageImportTest />);

      fireEvent.click(screen.getByTestId('select-package-type'));

      const fileInput = screen.getByTestId('file-input') as HTMLInputElement;
      const selectFileButton = screen.getByTestId('select-file-button');

      const validFile = new File(['content'], 'my-skill.skillpack.zip', {
        type: 'application/zip',
      });
      Object.defineProperty(validFile, 'path', {
        value: '/path/to/my-skill.skillpack.zip',
        configurable: true,
      });

      // Select file
      await userEvent.click(selectFileButton);
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      // File input should be reset (value cleared to allow re-selecting same file)
      await waitFor(() => {
        expect(fileInput.value).toBe('');
      });
    });
  });
});
