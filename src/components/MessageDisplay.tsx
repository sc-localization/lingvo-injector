import React from 'react';
import type { Message } from '../types';

interface MessageDisplayProps {
  message: Message | null;
}

export const MessageDisplay: React.FC<MessageDisplayProps> = ({ message }) => {
  if (!message) return null;

  return <div>{message.text}</div>;
};
