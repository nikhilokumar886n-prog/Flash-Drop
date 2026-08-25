const API_BASE = '/api/shares';

export const api = {
  /**
   * Upload multiple files with progress tracking
   */
  async createShare(formData, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', API_BASE);

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent, event.loaded, event.total);
          }
        };
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new Error(data.error || 'Failed to create share.'));
          }
        } catch (e) {
          reject(new Error('Invalid response from server.'));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during upload. Please check your connection.'));
      };

      xhr.send(formData);
    });
  },

  /**
   * Lookup share details by 6-digit access code
   */
  async getShareByCode(code) {
    const res = await fetch(`${API_BASE}/code/${code}`);
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.error || 'Failed to find share.');
      error.status = res.status;
      throw error;
    }
    return data;
  },

  /**
   * Lookup share details by shareId
   */
  async getShareById(id) {
    const res = await fetch(`${API_BASE}/${id}`);
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.error || 'Failed to find share.');
      error.status = res.status;
      throw error;
    }
    return data;
  },

  /**
   * Get sender dashboard management info
   */
  async getManageInfo(id, manageKey) {
    const res = await fetch(`${API_BASE}/${id}/manage`, {
      headers: {
        'x-manage-key': manageKey
      }
    });
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.error || 'Failed to load sender dashboard.');
      error.status = res.status;
      throw error;
    }
    return data;
  },

  /**
   * Extend expiry
   */
  async extendExpiry(id, manageKey, additionalMinutes) {
    const res = await fetch(`${API_BASE}/${id}/extend`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-manage-key': manageKey
      },
      body: JSON.stringify({ additionalMinutes })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to extend expiry.');
    }
    return data;
  },

  /**
   * Delete share manually
   */
  async deleteShare(id, manageKey) {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: {
        'x-manage-key': manageKey
      }
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete share.');
    }
    return data;
  },

  /**
   * Direct download and preview URLs
   */
  getDownloadFileUrl(shareId, fileId) {
    return `${API_BASE}/${shareId}/files/${fileId}/download`;
  },

  getPreviewFileUrl(shareId, fileId) {
    return `${API_BASE}/${shareId}/files/${fileId}/preview`;
  },

  getDownloadZipUrl(shareId) {
    return `${API_BASE}/${shareId}/download-zip`;
  },

  getQRCodeUrl(shareId, format = 'png') {
    return `${API_BASE}/${shareId}/qr?format=${format}`;
  }
};
