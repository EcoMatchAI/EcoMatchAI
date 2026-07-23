import React, { useState } from 'react';
import { ArrowLeftRight, MoreVertical, Send, Smile, Leaf, Search, X, ArrowLeft } from 'lucide-react';
import Sidebar from '../common/Sidebar';
import Topnav from '../common/Topnav';
import Footer from '../common/Footer';
import { PackagingIcon } from '../common/Icons';

import avatarImg from '../../assets/avatar.png';

export const MessagesPage = ({ currentPage, setCurrentPage, triggerToast }) => {
  const [typedMessage, setTypedMessage] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [activeConvId, setActiveConvId] = useState('biopack_1');
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [chatHistories, setChatHistories] = useState({
    biopack_1: [
      { id: 1, sender: 'me', text: 'Hi BioPack, confirmed pickup for 120kg coffee grounds tomorrow?', time: '9:38 PM', status: 'Sent' },
      { id: 2, sender: 'them', text: 'Yes, 10am at the side entrance.', time: '1:31 PM', status: 'Received' }
    ],
    greenbrew_1: [
      { id: 1, sender: 'them', text: 'Hi snmrement oui online.', time: '10:26 AM', status: 'Received' }
    ],
    greenbrew_2: [
      { id: 1, sender: 'them', text: 'Hi 1lkg coffee grounds tomorrow?', time: '7:30 PM', status: 'Received' }
    ],
    biopack_2: [
      { id: 1, sender: 'them', text: 'Yes, 10am at the side entrance.', time: '1:31 PM', status: 'Received' }
    ],
    greenbrew_3: [
      { id: 1, sender: 'them', text: 'Hi, M0arm at the side entrance...', time: '1:57 PM', status: 'Received' }
    ],
    greenbrew_4: [
      { id: 1, sender: 'them', text: 'Hey BioPack, confirmed to no...', time: 'Message', status: 'Received' }
    ],
    greenbrew_5: [
      { id: 1, sender: 'them', text: 'Yes, 10am at the side entrance.', time: 'Mesconn', status: 'Received' }
    ]
  });

  const conversationItems = [
    { id: 'greenbrew_1', name: 'GreenBrew Co.', type: 'exchange', time: '10:26 AM', snippet: 'Hi snmrement oui online.', avatarType: 'user' },
    { id: 'biopack_1', name: 'BioPack Solutions', type: 'text', time: '9:38 PM', snippet: 'Hi BioPack, confirmed pickup...', avatarType: 'purple-box' },
    { id: 'greenbrew_2', name: 'GreenBrew Co.', type: 'left-arrow', time: '7:30 PM', snippet: 'Hi 1lkg coffee grounds tomor...', avatarType: 'user' },
    { id: 'biopack_2', name: 'BioPack Solutions', type: 'text', time: '1:31 PM', snippet: 'Yes, 10am at the side entrance.', avatarType: 'green-leaf' },
    { id: 'greenbrew_3', name: 'GreenBrew Co.', type: 'left-arrow', time: '1:57 PM', snippet: 'Hi, M0arm at the side entranc...', avatarType: 'user' },
    { id: 'greenbrew_4', name: 'GreenBrew Co.', type: 'left-arrow', time: 'Message', snippet: 'Hey BioPack, confirmed to no...', avatarType: 'user' },
    { id: 'greenbrew_5', name: 'GreenBrew Co.', type: 'left-arrow', time: 'Mesconn', snippet: 'Yes, 10am at the side entran...', avatarType: 'user' }
  ];

  const normalizedSearch = contactSearch.trim().toLowerCase();
  const filteredConversations = normalizedSearch
    ? conversationItems.filter(
        (item) =>
          item.name.toLowerCase().includes(normalizedSearch) ||
          item.snippet.toLowerCase().includes(normalizedSearch)
      )
    : conversationItems;

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;

    const newMsg = {
      id: chatHistories[activeConvId].length + 1,
      sender: 'me',
      text: typedMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Sent'
    };

    setChatHistories(prev => ({
      ...prev,
      [activeConvId]: [...prev[activeConvId], newMsg]
    }));
    
    const sentMsgText = typedMessage;
    setTypedMessage('');
    triggerToast('Message sent successfully!');

    // Simulated Response
    setTimeout(() => {
      const responseMsg = {
        id: chatHistories[activeConvId].length + 2,
        sender: 'them',
        text: `Thanks for the update: "${sentMsgText.length > 25 ? sentMsgText.substring(0, 25) + '...' : sentMsgText}". We will coordinate accordingly.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'Received'
      };
      setChatHistories(prev => ({
        ...prev,
        [activeConvId]: [...prev[activeConvId], responseMsg]
      }));
      triggerToast('New message received from ' + (activeConvId.startsWith('biopack') ? 'BioPack Solutions' : 'GreenBrew Co.'));
    }, 2000);
  };

  return (
    <div className="inbox-page-wrapper">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} triggerToast={triggerToast} />
      <main className="inbox-main-content">
        <Topnav triggerToast={triggerToast} setCurrentPage={setCurrentPage} />
        <div className="inbox-view-container">
          <h1 className="inbox-view-title">Inbox</h1>

          <div className="inbox-panel-grid">
            {/* Column 1: Conversations List */}
            <div className={`conversations-col ${showChatOnMobile ? 'mobile-hidden' : 'mobile-visible'}`}>
              <div className="conversations-header">CONVERSATIONS</div>

              <div className="conv-search-wrapper">
                <Search size={16} className="conv-search-icon" />
                <input
                  type="text"
                  className="conv-search-input"
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                />
                {contactSearch && (
                  <button
                    type="button"
                    className="conv-search-clear"
                    aria-label="Clear search"
                    onClick={() => setContactSearch('')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <ul className="conversations-list">
                {filteredConversations.length === 0 ? (
                  <li className="conv-empty">No contacts found for "{contactSearch}"</li>
                ) : filteredConversations.map((item) => (
                  <li key={item.id}>
                    <button 
                      className={`conversation-item-btn ${activeConvId === item.id ? 'active' : ''}`}
                      onClick={() => {
                        setActiveConvId(item.id);
                        setShowChatOnMobile(true);
                      }}
                    >
                      {item.avatarType === 'user' && (
                        <div className="conv-avatar-wrapper">
                          <img src={avatarImg} alt="User Avatar" className="conv-avatar-img" />
                        </div>
                      )}
                      {item.avatarType === 'purple-box' && (
                        <div className="conv-avatar-wrapper" style={{ backgroundColor: '#ECE9F9', color: '#7C3AED' }}>
                          <PackagingIcon size={20} />
                        </div>
                      )}
                      {item.avatarType === 'green-leaf' && (
                        <div className="conv-avatar-leaf">
                          <Leaf size={18} fill="currentColor" />
                        </div>
                      )}

                      <div className="conv-details">
                        <div className="conv-top-row">
                          <span className="conv-name">{item.name}</span>
                          <span className="conv-meta">
                            {item.type === 'exchange' && <ArrowLeftRight size={10} />}
                            {item.type === 'left-arrow' && <span style={{ fontSize: '10px' }}>←</span>}
                            {item.time}
                          </span>
                        </div>
                        <p className="conv-snippet">{item.snippet}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Chat Display */}
            <div className={`chat-col ${showChatOnMobile ? 'mobile-visible' : 'mobile-hidden'}`}>
              <div className="chat-header">
                <div className="chat-partner-info">
                  <button 
                    type="button" 
                    className="chat-mobile-back-btn" 
                    onClick={() => setShowChatOnMobile(false)}
                    aria-label="Back to conversations list"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="chat-partner-avatar">
                    {activeConvId.startsWith('biopack') ? <PackagingIcon size={18} /> : <Leaf size={16} fill="currentColor" />}
                  </div>
                  <span className="chat-partner-name">
                    {activeConvId.startsWith('biopack') ? 'BioPack Solutions' : 'GreenBrew Co.'}
                  </span>
                  <ArrowLeftRight size={14} style={{ color: '#9CA3AF', cursor: 'pointer' }} />
                  <div className="chat-action-badge-circle">
                    <Leaf size={12} fill="currentColor" />
                  </div>
                </div>

                <button className="inbox-topnav-btn" aria-label="More options" onClick={() => triggerToast('Conversation actions')}>
                  <MoreVertical size={18} />
                </button>
              </div>


              {/* Scrollable Messages Panel */}
              <div className="chat-messages-container">
                {chatHistories[activeConvId]?.map((msg) => (
                  <div key={msg.id} className={`chat-message-row ${msg.sender === 'me' ? 'sent' : 'received'}`}>
                    <div className="chat-msg-avatar-group">
                      {msg.sender === 'them' && (
                        <div className="chat-msg-avatar-icon">
                          {activeConvId.startsWith('biopack') ? <PackagingIcon size={15} /> : <Leaf size={14} fill="currentColor" />}
                        </div>
                      )}
                      <div className="chat-msg-bubble">
                        {msg.text}
                      </div>
                    </div>
                    <span className="chat-msg-meta">
                      {msg.sender === 'me' ? 'Sent' : 'Received'} {msg.time}
                    </span>
                  </div>
                ))}
              </div>

              {/* Message Input Box */}
              <form className="chat-input-bar" onSubmit={handleSendMessage}>
                <div className="chat-input-wrapper">
                  <input 
                    type="text" 
                    className="chat-input-field" 
                    placeholder="Type a message..." 
                    value={typedMessage}
                    onChange={(e) => setTypedMessage(e.target.value)}
                  />
                  <div className="chat-input-actions">
                    <button type="button" className="chat-input-action-btn" aria-label="Add Emoji" onClick={() => triggerToast('Emoji selection menu open')}>
                      <Smile size={18} />
                    </button>
                  </div>
                </div>
                
                <button type="submit" className="landing-btn-started" style={{ padding: '10px 14px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Send message">
                  <Send size={16} />
                </button>
              </form>
            </div>

          </div>
        </div>
        <Footer variant="compact" triggerToast={triggerToast} setCurrentPage={setCurrentPage} />
      </main>
    </div>
  );
};
export default MessagesPage;
