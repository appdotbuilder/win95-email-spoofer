import { useState } from 'react';
import { trpc } from './utils/trpc';
import type { SendEmailInput } from '../../server/src/schema';
import './App.css';

interface AttachmentFile {
  id: number;
  file: File;
}

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [fileIdCounter, setFileIdCounter] = useState(0);
  const [allFiles, setAllFiles] = useState<AttachmentFile[]>([]);

  // Form state
  const [formData, setFormData] = useState<{
    from_name: string;
    from_email: string;
    to_name: string;
    to_email: string;
    replyto_name: string;
    replyto_email: string;
    cc_name: string;
    cc_email: string;
    bcc_name: string;
    bcc_email: string;
    subject: string;
    body: string;
    content_type: 'plain' | 'html' | 'rich';
  }>({
    from_name: '',
    from_email: '',
    to_name: '',
    to_email: '',
    replyto_name: '',
    replyto_email: '',
    cc_name: '',
    cc_email: '',
    bcc_name: '',
    bcc_email: '',
    subject: '',
    body: '',
    content_type: 'plain'
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    
    const newAttachments = newFiles.map(file => ({
      id: fileIdCounter + allFiles.length + newFiles.indexOf(file),
      file
    }));

    setAllFiles(prev => [...prev, ...newAttachments]);
    setFileIdCounter(prev => prev + newFiles.length);
    
    // Clear the input for re-selection
    e.target.value = '';
  };

  const removeAttachment = (fileId: number) => {
    setAllFiles(prev => prev.filter(fileObj => fileObj.id !== fileId));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:mime/type;base64, prefix
        resolve(result.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Convert files to base64
      const attachments = await Promise.all(
        allFiles.map(async (fileObj) => ({
          filename: fileObj.file.name,
          content_type: fileObj.file.type,
          size: fileObj.file.size,
          file_data: await fileToBase64(fileObj.file)
        }))
      );

      // Prepare the email data according to the schema
      const emailData: SendEmailInput = {
        from: {
          name: formData.from_name,
          email: formData.from_email
        },
        to: {
          name: formData.to_name,
          email: formData.to_email
        },
        reply_to: (formData.replyto_name || formData.replyto_email) ? {
          name: formData.replyto_name,
          email: formData.replyto_email
        } : undefined,
        cc: (formData.cc_name || formData.cc_email) ? {
          name: formData.cc_name,
          email: formData.cc_email
        } : undefined,
        bcc: (formData.bcc_name || formData.bcc_email) ? {
          name: formData.bcc_name,
          email: formData.bcc_email
        } : undefined,
        subject: formData.subject,
        body: formData.body,
        message_format: formData.content_type,
        attachments
      };

      const response = await trpc.sendEmail.mutate(emailData);
      
      if (response.success) {
        alert('Email sent successfully! 📧');
        // Reset form
        setFormData({
          from_name: '',
          from_email: '',
          to_name: '',
          to_email: '',
          replyto_name: '',
          replyto_email: '',
          cc_name: '',
          cc_email: '',
          bcc_name: '',
          bcc_email: '',
          subject: '',
          body: '',
          content_type: 'plain'
        });
        setAllFiles([]);
      } else {
        alert(`Failed to send email: ${response.message}`);
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="window">
      <div className="title-bar">
        <div className="title-bar-left">
          <div className="app-icon">
            <img src="/retro-mail-icon-v2.png" alt="RetroMail" />
          </div>
          <div className="title-bar-text">Email Spoofer v1.0.0</div>
        </div>
        <div className="title-bar-controls">
          <button className="title-bar-control minimize" aria-label="Minimize">
            <span className="control-icon">−</span>
          </button>
          <button className="title-bar-control maximize" aria-label="Maximize">
            <span className="control-icon">☐</span>
          </button>
          <button className="title-bar-control close" aria-label="Close">
            <span className="control-icon">⨯</span>
          </button>
        </div>
      </div>

      <div className="window-body">
        <form className="email-form" onSubmit={handleSubmit}>
          
          <fieldset className="field-group">
            <legend>From</legend>
            <div className="field-row">
              <label htmlFor="from_name">Name:</label>
              <input
                type="text"
                id="from_name"
                name="from_name"
                placeholder="Your Name"
                value={formData.from_name}
                onChange={(e) => handleInputChange('from_name', e.target.value)}
                required
              />
            </div>
            <div className="field-row">
              <label htmlFor="from_email">Email:</label>
              <input
                type="email"
                id="from_email"
                name="from_email"
                placeholder="you@example.com"
                value={formData.from_email}
                onChange={(e) => handleInputChange('from_email', e.target.value)}
                required
              />
            </div>
          </fieldset>

          <fieldset className="field-group">
            <legend>To</legend>
            <div className="field-row">
              <label htmlFor="to_name">Name:</label>
              <input
                type="text"
                id="to_name"
                name="to_name"
                placeholder="Recipient Name"
                value={formData.to_name}
                onChange={(e) => handleInputChange('to_name', e.target.value)}
                required
              />
            </div>
            <div className="field-row">
              <label htmlFor="to_email">Email:</label>
              <input
                type="email"
                id="to_email"
                name="to_email"
                placeholder="recipient@example.com"
                value={formData.to_email}
                onChange={(e) => handleInputChange('to_email', e.target.value)}
                required
              />
            </div>
          </fieldset>

          <fieldset className="field-group">
            <legend>Reply-To</legend>
            <div className="field-row">
              <label htmlFor="replyto_name">Name:</label>
              <input
                type="text"
                id="replyto_name"
                name="replyto_name"
                placeholder="Reply Name"
                value={formData.replyto_name}
                onChange={(e) => handleInputChange('replyto_name', e.target.value)}
              />
            </div>
            <div className="field-row">
              <label htmlFor="replyto_email">Email:</label>
              <input
                type="email"
                id="replyto_email"
                name="replyto_email"
                placeholder="reply@example.com"
                value={formData.replyto_email}
                onChange={(e) => handleInputChange('replyto_email', e.target.value)}
              />
            </div>
          </fieldset>

          <fieldset className="field-group">
            <legend>CC</legend>
            <div className="field-row">
              <label htmlFor="cc_name">Name:</label>
              <input
                type="text"
                id="cc_name"
                name="cc_name"
                placeholder="CC Name"
                value={formData.cc_name}
                onChange={(e) => handleInputChange('cc_name', e.target.value)}
              />
            </div>
            <div className="field-row">
              <label htmlFor="cc_email">Email:</label>
              <input
                type="email"
                id="cc_email"
                name="cc_email"
                placeholder="cc@example.com"
                value={formData.cc_email}
                onChange={(e) => handleInputChange('cc_email', e.target.value)}
              />
            </div>
          </fieldset>

          <fieldset className="field-group">
            <legend>BCC</legend>
            <div className="field-row">
              <label htmlFor="bcc_name">Name:</label>
              <input
                type="text"
                id="bcc_name"
                name="bcc_name"
                placeholder="BCC Name"
                value={formData.bcc_name}
                onChange={(e) => handleInputChange('bcc_name', e.target.value)}
              />
            </div>
            <div className="field-row">
              <label htmlFor="bcc_email">Email:</label>
              <input
                type="email"
                id="bcc_email"
                name="bcc_email"
                placeholder="bcc@example.com"
                value={formData.bcc_email}
                onChange={(e) => handleInputChange('bcc_email', e.target.value)}
              />
            </div>
          </fieldset>

          <fieldset className="field-group">
            <legend>Subject</legend>
            <div className="field-row">
              <label htmlFor="subject">Subject:</label>
              <input
                type="text"
                id="subject"
                name="subject"
                placeholder="Email subject"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                required
              />
            </div>
          </fieldset>

          <fieldset className="field-group">
            <legend>Message</legend>
            <div className="field-row">
              <label htmlFor="body">Body:</label>
              <textarea
                id="body"
                name="body"
                placeholder="Email message body"
                value={formData.body}
                onChange={(e) => handleInputChange('body', e.target.value)}
                required
                rows={6}
                className="message-body"
              />
            </div>
          </fieldset>

          <fieldset className="field-group">
            <legend>Message Format</legend>
            <div className="radio-group">
              <div className="radio-option">
                <input
                  type="radio"
                  id="content-type-plain"
                  name="content_type"
                  value="plain"
                  checked={formData.content_type === 'plain'}
                  onChange={(e) => handleInputChange('content_type', e.target.value)}
                />
                <label htmlFor="content-type-plain" className="radio-button">Plain Text</label>
              </div>
              <div className="radio-option">
                <input
                  type="radio"
                  id="content-type-html"
                  name="content_type"
                  value="html"
                  checked={formData.content_type === 'html'}
                  onChange={(e) => handleInputChange('content_type', e.target.value)}
                />
                <label htmlFor="content-type-html" className="radio-button">HTML</label>
              </div>
              <div className="radio-option">
                <input
                  type="radio"
                  id="content-type-rich"
                  name="content_type"
                  value="rich"
                  checked={formData.content_type === 'rich'}
                  onChange={(e) => handleInputChange('content_type', e.target.value)}
                />
                <label htmlFor="content-type-rich" className="radio-button">Rich Text</label>
              </div>
            </div>
          </fieldset>

          <fieldset className="field-group">
            <legend>Attachments</legend>
            <div className="field-row">
              <label htmlFor="attachments" className="file-label">Choose Files:</label>
              <input
                type="file"
                id="attachments"
                name="attachments"
                multiple
                accept="*/*"
                className="file-input"
                onChange={handleFileChange}
              />
            </div>
            <div id="attachments-panel" className="attachments-panel">
              <div className="panel-header">Selected Files:</div>
              <ul id="attachments-list" className="attachments-list">
                {allFiles.length === 0 ? (
                  <li className="placeholder">No files selected</li>
                ) : (
                  allFiles.map((fileObj) => (
                    <li key={fileObj.id} className="attachment-item">
                      <span className="attachment-name">
                        {fileObj.file.name} ({(fileObj.file.size / 1024).toFixed(1)} KB)
                      </span>
                      <button
                        type="button"
                        className="attachment-remove"
                        onClick={() => removeAttachment(fileObj.id)}
                      >
                        ×
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </fieldset>

          <div className="form-actions">
            <button type="submit" name="send" className="send-button" disabled={isLoading}>
              <span className="button-icon">📧</span>
              {isLoading ? 'Sending...' : 'Send Email'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default App;