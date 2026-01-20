import jsQR from 'jsqr';
import type {
  ImageImportError,
  ShareImageData,
  SkillImportInfo,
} from '../types/share';

/**
 * 从图片文件中识别 QR 码
 */
export const detectQRCode = async (file: File): Promise<string | null> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // 创建 Canvas 来读取图片数据
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(null);
          return;
        }

        // 限制图片尺寸以提高性能
        const maxSize = 1000;
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // 获取图片数据
        const imageData = ctx.getImageData(0, 0, width, height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          resolve(code.data);
        } else {
          resolve(null);
        }
      };

      img.onerror = () => {
        resolve(null);
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      resolve(null);
    };

    reader.readAsDataURL(file);
  });
};

/**
 * 解析 QR 码数据为 ShareImageData
 */
export const parseQRCodeData = (
  qrData: string
): { success: true; data: ShareImageData } | { success: false; error: ImageImportError } => {
  try {
    // 解码流程：atob → decodeURIComponent → JSON.parse
    // 逆向 Phase 2 的编码流程
    const decoded = atob(qrData);
    const unescaped = decodeURIComponent(decoded);
    const data = JSON.parse(unescaped) as ShareImageData;

    // 验证数据格式
    if (!data.version || !data.type || !data.data) {
      return { success: false, error: 'invalid_share_format' };
    }

    // 验证版本
    if (data.version !== '1.0') {
      return { success: false, error: 'version_mismatch' };
    }

    // 验证类型
    if (data.type !== 'skill') {
      return { success: false, error: 'invalid_share_format' };
    }

    // 验证必需字段
    if (!data.data.id || !data.data.name || !data.data.description) {
      return { success: false, error: 'invalid_share_format' };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: 'invalid_qr_data' };
  }
};

/**
 * 从分享数据提取 Skill 导入信息
 */
export const extractSkillImportInfo = (shareData: ShareImageData): SkillImportInfo => {
  return {
    skillId: shareData.data.id,
    skillName: shareData.data.name,
    sourceUrl: shareData.data.sourceUrl,
    installUrl: shareData.data.installUrl,
    description: shareData.data.description,
  };
};

/**
 * 获取本地化错误信息
 */
export const getErrorMessage = (
  error: ImageImportError,
  language: 'zh' | 'en'
): string => {
  const messages: Record<ImageImportError, { zh: string; en: string }> = {
    no_qrcode_found: {
      zh: '未在图片中识别到二维码',
      en: 'No QR code found in the image',
    },
    invalid_qr_data: {
      zh: '二维码数据格式错误',
      en: 'Invalid QR code data format',
    },
    invalid_share_format: {
      zh: '分享数据格式无效',
      en: 'Invalid share data format',
    },
    version_mismatch: {
      zh: '分享数据版本不匹配',
      en: 'Share data version mismatch',
    },
    network_error: {
      zh: '网络连接失败',
      en: 'Network connection failed',
    },
    import_failed: {
      zh: '导入失败',
      en: 'Import failed',
    },
    unknown_error: {
      zh: '未知错误',
      en: 'Unknown error',
    },
  };

  return messages[error]?.[language] || messages.unknown_error[language];
};

/**
 * 完整流程：从图片文件到 Skill 导入信息
 */
export const importSkillFromImage = async (
  file: File,
  language: 'zh' | 'en'
): Promise<{
  success: boolean;
  skillInfo?: SkillImportInfo;
  previewUrl?: string;
  error?: ImageImportError;
  errorMessage?: string;
}> => {
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    return {
      success: false,
      error: 'invalid_qr_data',
      errorMessage: language === 'zh' ? '请选择图片文件' : 'Please select an image file',
    };
  }

  // 验证文件大小（限制 10MB）
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      success: false,
      error: 'invalid_qr_data',
      errorMessage: language === 'zh' ? '图片文件过大（最大 10MB）' : 'Image file too large (max 10MB)',
    };
  }

  // 创建预览 URL
  const previewUrl = URL.createObjectURL(file);

  try {
    // 步骤 1：识别 QR 码
    const qrData = await detectQRCode(file);
    if (!qrData) {
      return {
        success: false,
        previewUrl,
        error: 'no_qrcode_found',
        errorMessage: getErrorMessage('no_qrcode_found', language),
      };
    }

    // 步骤 2：解析 QR 码数据
    const parseResult = parseQRCodeData(qrData);
    if (!parseResult.success) {
      return {
        success: false,
        previewUrl,
        error: parseResult.error,
        errorMessage: getErrorMessage(parseResult.error, language),
      };
    }

    // 步骤 3：提取 Skill 导入信息
    const skillInfo = extractSkillImportInfo(parseResult.data);

    return {
      success: true,
      skillInfo,
      previewUrl,
    };
  } catch (error) {
    return {
      success: false,
      previewUrl,
      error: 'unknown_error',
      errorMessage: getErrorMessage('unknown_error', language),
    };
  }
};
