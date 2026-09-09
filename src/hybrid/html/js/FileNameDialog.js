/**
 * 文件名输入弹窗 - 原生 JS 实现
 */
class FileNameDialog {
  constructor(options = {}) {
    this.options = {
      sendModalTitle: options.sendModalTitle || '发送文件',
      sendModalBtnText: options.sendModalBtnText || '立即发送',
      onConfirm: options.onConfirm || (() => {}),
      onCancel: options.onCancel || (() => {}),
    };
    this.dialogElement = null;
    this.overlayElement = null;
    this.inputElement = null;
    this.fileName = '';
    this.fileSize = 0;
    this.fileExtension = '';
  }

  /**
   * 分离文件名和后缀
   */
  splitFileName(fullName) {
    if (!fullName) return { name: '', ext: '' };
    const lastDotIndex = fullName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return { name: fullName, ext: '' };
    }
    return {
      name: fullName.substring(0, lastDotIndex),
      ext: fullName.substring(lastDotIndex + 1),
    };
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(size) {
    if (!size) return '0 KB';
    if (size < 1024) {
      return size + ' B';
    } else if (size < 1024 * 1024) {
      return (size / 1024).toFixed(2) + ' KB';
    } else {
      return (size / (1024 * 1024)).toFixed(2) + ' MB';
    }
  }

  /**
   * 创建弹窗 HTML
   */
  createDialogHTML() {
    const { name } = this.splitFileName(this.fileName);
    const fileType = this.fileExtension || 'file';
    const fileSizeText = this.formatFileSize(this.fileSize);

    return `
      <div class="file-name-dialog-overlay" id="fileNameDialogOverlay">
        <div class="file-name-dialog">
          <div class="dialog-header">
            <span class="dialog-title">${this.options.sendModalTitle}</span>
            <div class="dialog-close" id="fileNameDialogClose">
              <span class="close-icon">×</span>
            </div>
          </div>
          <div class="dialog-content">
            <div class="file-type-tag">${fileType}</div>
            <div class="input-wrapper">
              <div class="file-name-input-wrapper">
                <input 
                  type="text" 
                  class="file-name-input" 
                  id="fileNameDialogInput"
                  placeholder="请输入文件名"
                  maxlength="100"
                  value="${name || ''}"
                />
              </div>
              <div class="file-size">${fileSizeText}</div>
            </div>
          </div>
          <div class="dialog-footer">
            <button type="button" class="send-btn" id="fileNameDialogConfirm">
              ${this.options.sendModalBtnText}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 创建弹窗样式
   */
  createDialogStyles() {
    const styleId = 'fileNameDialogStyles';
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .file-name-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        animation: fadeIn 0.2s ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .file-name-dialog {
        width: 320px;
        background: #fff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        animation: slideUp 0.3s ease;
      }

      @keyframes slideUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 16px 12px;
        border-bottom: 1px solid #f5f5f5;
      }

      .dialog-title {
        font-size: 16px;
        color: #333;
        font-weight: 500;
      }

      .dialog-close {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: opacity 0.2s;
      }

      .dialog-close:active {
        opacity: 0.6;
      }

      .close-icon {
        font-size: 22px;
        color: #999;
        line-height: 1;
        font-weight: 300;
      }

      .dialog-content {
        padding: 24px 16px 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .file-type-tag {
        background: #0066CC;
        color: #fff;
        padding: 6px 16px;
        border-radius: 6px;
        font-size: 15px;
        margin-bottom: 20px;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        min-width: 60px;
        text-align: center;
      }

      .input-wrapper {
        width: 100%;
        display: flex;
        flex-direction: column;
      }

      .file-name-input-wrapper {
        width: 100%;
        display: flex;
        align-items: center;
        margin-bottom: 6px;
      }

      .file-name-input {
        flex: 1;
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        font-size: 15px;
        color: #333;
        outline: none;
        box-sizing: border-box;
      }

      .file-name-input:focus {
        border-color: #0066CC;
      }

      .file-size {
        font-size: 13px;
        color: #999;
        margin-left: 2px;
        text-align: center;
        margin-top: 6px;
      }

      .dialog-footer {
        padding: 0 16px 16px;
      }

      .send-btn {
        width: 100%;
        background: #0066CC;
        color: #fff;
        border: 0;
        border-radius: 6px;
        font-size: 16px;
        font-weight: 500;
        letter-spacing: 0.5px;
        padding: 14px 0;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .send-btn:active {
        background: #0052a3;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 显示弹窗
   */
  show(fileName, fileSize) {
    this.fileName = fileName || '';
    this.fileSize = fileSize || 0;
    const { ext } = this.splitFileName(this.fileName);
    this.fileExtension = ext;

    // 创建样式
    this.createDialogStyles();

    // 创建弹窗 HTML
    const html = this.createDialogHTML();
    document.body.insertAdjacentHTML('beforeend', html);

    // 获取元素
    this.overlayElement = document.getElementById('fileNameDialogOverlay');
    this.dialogElement = this.overlayElement.querySelector('.file-name-dialog');
    this.inputElement = document.getElementById('fileNameDialogInput');
    const closeBtn = document.getElementById('fileNameDialogClose');
    const confirmBtn = document.getElementById('fileNameDialogConfirm');

    // 聚焦输入框
    // setTimeout(() => {
    //   if (this.inputElement) {
    //     this.inputElement.focus();
    //     this.inputElement.select();
    //   }
    // }, 100);

    // 绑定事件
    closeBtn.addEventListener('click', () => this.hide(true));
    confirmBtn.addEventListener('click', () => this.handleConfirm());
    
    // 点击遮罩层不关闭（与 Vue 组件保持一致）
    // this.overlayElement.addEventListener('click', (e) => {
    //   if (e.target === this.overlayElement) {
    //     this.hide(true);
    //   }
    // });

    // ESC 键关闭
    this.escHandler = (e) => {
      if (e.key === 'Escape') {
        this.hide(true);
      }
    };
    document.addEventListener('keydown', this.escHandler);

    // 阻止输入框回车提交
    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleConfirm();
      }
    });
  }

  /**
   * 处理确认
   */
  handleConfirm() {
    const inputValue = this.inputElement.value.trim();
    if (!inputValue) {
      // 简单的提示，可以后续优化为更好的提示方式
      alert('请输入文件名');
      this.inputElement.focus();
      return;
    }

    // 组合文件名和后缀
    const fullFileName = this.fileExtension
      ? `${inputValue}.${this.fileExtension}`
      : inputValue;

    this.hide(false);
    if (this.options.onConfirm) {
      this.options.onConfirm(fullFileName);
    }
  }

  /**
   * 隐藏弹窗
   */
  hide(isCancel = false) {
    if (this.overlayElement) {
      // 移除 ESC 事件监听
      if (this.escHandler) {
        document.removeEventListener('keydown', this.escHandler);
        this.escHandler = null;
      }

      // 添加淡出动画
      this.overlayElement.style.animation = 'fadeOut 0.2s ease';
      setTimeout(() => {
        if (this.overlayElement && this.overlayElement.parentNode) {
          this.overlayElement.parentNode.removeChild(this.overlayElement);
        }
        this.overlayElement = null;
        this.dialogElement = null;
        this.inputElement = null;

        if (isCancel && this.options.onCancel) {
          this.options.onCancel();
        }
      }, 200);
    }
  }
}

// 导出为全局函数，方便调用
window.FileNameDialog = FileNameDialog;

