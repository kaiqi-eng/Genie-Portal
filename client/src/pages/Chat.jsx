import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { chatApi } from '../services/api';
import Sidebar from '../components/Chat/Sidebar';
import ChatContainer from '../components/Chat/ChatContainer';

function Chat() {
  const { user, logout, isAdmin } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
    } else {
      setMessages([]);
    }
  }, [activeConversation]);

  const fetchConversations = async () => {
    try {
      const response = await chatApi.getConversations();
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    setMessagesLoading(true);
    try {
      const response = await chatApi.getMessages(conversationId);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleNewConversation = async () => {
    try {
      const response = await chatApi.createConversation();
      setConversations((prev) => [response.data, ...prev]);
      setActiveConversation(response.data);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSelectConversation = (conversation) => {
    setActiveConversation(conversation);
  };

  const handleDeleteConversation = async (conversationId) => {
    try {
      await chatApi.deleteConversation(conversationId);
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (activeConversation?.id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleSendMessage = useCallback(async (message) => {
    if (!activeConversation) {
      // Create a new conversation first
      try {
        const convResponse = await chatApi.createConversation();
        const newConversation = convResponse.data;
        setConversations((prev) => [newConversation, ...prev]);
        setActiveConversation(newConversation);

        // Now send the message
        const response = await chatApi.sendMessage(newConversation.id, message);
        setMessages([response.data.userMessage, response.data.assistantMessage]);
        
        // Update conversation in list with new title
        setConversations((prev) =>
          prev.map((c) =>
            c.id === newConversation.id
              ? { ...c, title: message.length > 50 ? message.substring(0, 47) + '...' : message }
              : c
          )
        );
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    } else {
      // Add optimistic user message
      const tempUserMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: message,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMessage]);

      try {
        const response = await chatApi.sendMessage(activeConversation.id, message);
        
        // Replace temp message with actual messages
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMessage.id),
          response.data.userMessage,
          response.data.assistantMessage,
        ]);

        // Update conversation in list (for updated_at sorting)
        setConversations((prev) => {
          const updated = prev.map((c) =>
            c.id === activeConversation.id
              ? { ...c, updated_at: new Date().toISOString() }
              : c
          );
          // Sort by updated_at
          return updated.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        });
      } catch (error) {
        console.error('Failed to send message:', error);
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));
      }
    }
  }, [activeConversation]);

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversation={activeConversation}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        user={user}
        onLogout={logout}
        isAdmin={isAdmin}
        loading={loading}
      />

      {/* Main Chat Area */}
      <ChatContainer
        messages={messages}
        onSendMessage={handleSendMessage}
        loading={messagesLoading}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        activeConversation={activeConversation}
      />
    </div>
  );
}

export default Chat;
