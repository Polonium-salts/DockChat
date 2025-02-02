'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Parser from 'rss-parser';
import { AIChat } from '../services/aiChat';
import AIConfig from './AIConfig';

export default function ChatInterface() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [rssUrl, setRssUrl] = useState('');
  const [rssFeeds, setRssFeeds] = useState([]);
  const [activeTab, setActiveTab] = useState('chat');
  const [aiConfig, setAiConfig] = useState(null);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiNewMessage, setAiNewMessage] = useState('');
  const [aiChats, setAiChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);

  // Initialize AI chat service
  useEffect(() => {
    const savedChats = localStorage.getItem('aiChats');
    if (savedChats) {
      setAiChats(JSON.parse(savedChats));
    }
    const savedConfig = localStorage.getItem('aiConfig');
    if (savedConfig) {
      setAiConfig(JSON.parse(savedConfig));
    }
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    localStorage.setItem('aiChats', JSON.stringify(aiChats));
  }, [aiChats]);

  // Create a new chat
  const createNewChat = () => {
    const newChat = {
      id: Date.now(),
      title: 'New Chat',
      messages: [],
      timestamp: new Date().toISOString(),
    };
    setAiChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setAiMessages([]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      content: newMessage,
      user: session.user,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setNewMessage('');

    // If AI is configured, get AI response
    if (aiConfig && (aiConfig.deepseek.enabled || aiConfig.kimi.enabled)) {
      setIsAiTyping(true);
      try {
        const aiChatService = new AIChat(aiConfig);
        const aiResponse = await aiChatService.chat(newMessage);
        
        const aiMessage = {
          id: Date.now() + 1,
          content: aiResponse.content,
          user: {
            name: `AI (${aiResponse.source})`,
            image: '/ai-avatar.png', // Add a default AI avatar image
            email: 'ai@system',
          },
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, aiMessage]);
      } catch (error) {
        console.error('AI chat error:', error);
        // Show error message to user
        const errorMessage = {
          id: Date.now() + 1,
          content: `AI Error: ${error.message}`,
          user: {
            name: 'System',
            image: '/system-avatar.png', // Add a default system avatar image
            email: 'system@system',
          },
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsAiTyping(false);
      }
    }
  };

  const handleSaveAiConfig = (config) => {
    setAiConfig(config);
    localStorage.setItem('aiConfig', JSON.stringify(config));
    setActiveTab('ai');  // 修改这里：保存后跳转到 AI Chat 界面
  };

  const handleAddRssFeed = async (e) => {
    e.preventDefault();
    if (!rssUrl.trim()) return;

    try {
      const parser = new Parser();
      const feed = await parser.parseURL(rssUrl);
      setRssFeeds((prev) => [...prev, {
        title: feed.title,
        items: feed.items.slice(0, 5),
        url: rssUrl,
      }]);
      setRssUrl('');
    } catch (error) {
      console.error('Error parsing RSS feed:', error);
      alert('Error parsing RSS feed. Please check the URL and try again.');
    }
  };

  const handleSendAiMessage = async (e) => {
    e.preventDefault();
    if (!aiNewMessage.trim()) return;

    // If no current chat, create a new one
    if (!currentChatId) {
      createNewChat();
    }

    const userMessage = {
      id: Date.now(),
      content: aiNewMessage,
      user: session.user,
      timestamp: new Date().toISOString(),
    };

    // Update current message list and chat history
    setAiMessages(prev => [...prev, userMessage]);
    setAiChats(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        // Update chat title to first message's first 20 characters
        const newTitle = chat.messages.length === 0 ? aiNewMessage.slice(0, 20) + '...' : chat.title;
        return {
          ...chat,
          title: newTitle,
          messages: [...chat.messages, userMessage],
        };
      }
      return chat;
    }));

    setAiNewMessage('');

    if (aiConfig && (aiConfig.deepseek.enabled || aiConfig.kimi.enabled)) {
      setIsAiTyping(true);
      try {
        const aiChatService = new AIChat(aiConfig);
        const aiResponse = await aiChatService.chat(aiNewMessage);
        
        const aiMessage = {
          id: Date.now() + 1,
          content: aiResponse.content,
          user: {
            name: `AI (${aiResponse.source})`,
            image: '/ai-avatar.svg',
            email: 'ai@system',
          },
          timestamp: new Date().toISOString(),
        };

        setAiMessages(prev => [...prev, aiMessage]);
        setAiChats(prev => prev.map(chat => {
          if (chat.id === currentChatId) {
            return {
              ...chat,
              messages: [...chat.messages, aiMessage],
            };
          }
          return chat;
        }));
      } catch (error) {
        console.error('AI chat error:', error);
        const errorMessage = {
          id: Date.now() + 1,
          content: `AI Error: ${error.message}`,
          user: {
            name: 'System',
            image: '/system-avatar.svg',
            email: 'system@system',
          },
          timestamp: new Date().toISOString(),
        };
        setAiMessages(prev => [...prev, errorMessage]);
        setAiChats(prev => prev.map(chat => {
          if (chat.id === currentChatId) {
            return {
              ...chat,
              messages: [...chat.messages, errorMessage],
            };
          }
          return chat;
        }));
      } finally {
        setIsAiTyping(false);
      }
    } else {
      const errorMessage = {
        id: Date.now() + 1,
        content: 'Please configure AI settings first',
        user: {
          name: 'System',
          image: '/system-avatar.svg',
          email: 'system@system',
        },
        timestamp: new Date().toISOString(),
      };
      setAiMessages(prev => [...prev, errorMessage]);
      setAiChats(prev => prev.map(chat => {
        if (chat.id === currentChatId) {
          return {
            ...chat,
            messages: [...chat.messages, errorMessage],
          };
        }
        return chat;
      }));
    }
  };

  return (
    <div className="flex h-screen w-full bg-white">
      {/* Left Navigation Bar */}
      <nav className="flex-none w-16 bg-white border-r border-gray-200">
        <div className="h-full flex flex-col items-center py-4">
          {/* User Avatar */}
          <div className="mb-8">
            <img
              src={session.user.image}
              alt={session.user.name}
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm hover:opacity-80 transition-opacity"
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`p-2 rounded-lg transition-colors ${
                activeTab === 'chat'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            <button
              onClick={() => setActiveTab('rss')}
              className={`p-2 rounded-lg transition-colors ${
                activeTab === 'rss'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`p-2 rounded-lg transition-colors ${
                activeTab === 'ai'
                  ? 'bg-purple-50 text-purple-600'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={() => signOut()}
            className="mt-auto p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Left Sidebar */}
      <aside className="flex-none w-72 border-r border-gray-200 bg-white">
        <div className="h-full flex flex-col">
          {activeTab === 'aiconfig' ? (
            <div className="h-full p-4">
              <AIConfig onSave={handleSaveAiConfig} config={aiConfig} />
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {activeTab === 'chat' ? 'Messages' : 
                   activeTab === 'rss' ? 'RSS Feeds' :
                   'AI Chat History'}
                </h2>
              </div>

              {activeTab === 'chat' ? (
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="text-sm text-gray-500 text-center">No messages yet</div>
                </div>
              ) : activeTab === 'ai' ? (
                <div className="flex-1 flex flex-col">
                  <div className="p-4 border-b border-gray-200">
                    <button
                      onClick={createNewChat}
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      New Chat
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {aiChats.length === 0 ? (
                      <div className="text-sm text-gray-500 text-center">No chat history</div>
                    ) : (
                      <div className="space-y-2">
                        {aiChats.map((chat) => (
                          <button
                            key={chat.id}
                            onClick={() => {
                              setCurrentChatId(chat.id);
                              setAiMessages(chat.messages);
                            }}
                            className={`w-full p-3 text-left rounded-lg transition-colors ${
                              currentChatId === chat.id
                                ? 'bg-purple-50 text-purple-900'
                                : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <div className="text-sm font-medium truncate">{chat.title}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(chat.timestamp).toLocaleDateString()}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <form onSubmit={handleAddRssFeed} className="space-y-2">
                    <input
                      type="url"
                      value={rssUrl}
                      onChange={(e) => setRssUrl(e.target.value)}
                      placeholder="Enter RSS URL..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Add Feed
                    </button>
                  </form>

                  <div className="space-y-3">
                    {rssFeeds.map((feed, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">{feed.title}</h4>
                        <ul className="space-y-1">
                          {feed.items.map((item, itemIndex) => (
                            <li key={itemIndex}>
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline block truncate"
                              >
                                {item.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50">
        <header className="flex-none h-16 bg-white border-b border-gray-200">
          <div className="h-full px-6 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">
              {activeTab === 'chat' ? 'Chat Room' : 
               activeTab === 'rss' ? 'RSS Reader' :
               activeTab === 'ai' ? 'AI Chat' :
               'AI Configuration'}
            </h1>
            {activeTab === 'ai' && (
              <button
                onClick={() => setActiveTab('aiconfig')}
                className="px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              >
                Configure AI
              </button>
            )}
          </div>
        </header>

        {activeTab === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto p-6 space-y-6">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.user.email === session.user.email ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex max-w-[70%] ${message.user.email === session.user.email ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                      <img
                        src={message.user.image}
                        alt={message.user.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <div className={`px-4 py-2 rounded-2xl ${
                          message.user.email === session.user.email
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none'
                        }`}>
                          {message.content}
                        </div>
                        <div className={`mt-1 flex items-center space-x-2 ${
                          message.user.email === session.user.email ? 'justify-end' : 'justify-start'
                        }`}>
                          <span className="text-xs text-gray-500">
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-none bg-white border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-center space-x-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={isAiTyping ? "AI is typing..." : "Type a message..."}
                  disabled={isAiTyping}
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isAiTyping}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </>
        ) : activeTab === 'ai' ? (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto p-6 space-y-6">
                {aiMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.user.email === session.user.email ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex max-w-[70%] ${message.user.email === session.user.email ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                      <img
                        src={message.user.image}
                        alt={message.user.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <div className={`px-4 py-2 rounded-2xl ${
                          message.user.email === session.user.email
                            ? 'bg-purple-600 text-white rounded-br-none'
                            : message.user.email === 'ai@system'
                            ? 'bg-green-50 border border-green-200 text-gray-900 rounded-bl-none'
                            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none'
                        }`}>
                          {message.content}
                        </div>
                        <div className={`mt-1 flex items-center space-x-2 ${
                          message.user.email === session.user.email ? 'justify-end' : 'justify-start'
                        }`}>
                          <span className="text-xs text-gray-500">
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {isAiTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-center space-x-2 bg-white rounded-lg shadow-sm p-3">
                      <img src="/ai-avatar.svg" alt="AI" className="w-6 h-6 rounded-full" />
                      <div className="text-gray-500">AI is typing...</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-none bg-white border-t border-gray-200 p-4">
              <form onSubmit={handleSendAiMessage} className="max-w-3xl mx-auto flex items-center space-x-4">
                <input
                  type="text"
                  value={aiNewMessage}
                  onChange={(e) => setAiNewMessage(e.target.value)}
                  placeholder={isAiTyping ? "AI is typing..." : "Ask AI anything..."}
                  disabled={isAiTyping}
                  className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isAiTyping}
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              {rssFeeds.length === 0 ? (
                <div className="text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                  <p>No RSS feeds added yet</p>
                  <p className="text-sm mt-2">Add your first feed using the sidebar</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {rssFeeds.map((feed, index) => (
                    <div key={index} className="bg-white rounded-lg shadow-sm p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{feed.title}</h3>
                      <div className="space-y-4">
                        {feed.items.map((item, itemIndex) => (
                          <a
                            key={itemIndex}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <h4 className="text-base font-medium text-gray-900">{item.title}</h4>
                            {item.contentSnippet && (
                              <p className="mt-1 text-sm text-gray-600 line-clamp-2">{item.contentSnippet}</p>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 