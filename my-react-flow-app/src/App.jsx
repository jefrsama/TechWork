import React, { useState, useCallback } from 'react';
import ReactFlow, {
    useNodesState,
    useEdgesState,
    addEdge,
} from 'react-flow-renderer';
import axios from 'axios';

import 'react-flow-renderer/dist/style.css';

const initialNodes = [
    { id: '1', position: { x: 300, y: 50 }, data: { label: 'Начало' }, type: 'input' },
    { id: '2', position: { x: 300, y: 125 }, data: { label: '/консультация' } },
    { id: '3', position: { x: 300, y: 200 }, data: { label: '/напишите_мне или /позвоните_мне' } },
    { id: '4', position: { x: 200, y: 300 }, data: { label: '/напишите_мне' } },
    { id: '5', position: { x: 400, y: 300 }, data: { label: '/позвоните_мне' } },
    { id: '6', position: { x: 300, y: 400 }, data: { label: 'Связаться' } },
];
const initialEdges = [
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e2-3', source: '2', target: '3' },
    { id: 'e4-6', source: '4', target: '6' },
    { id: 'e3-5', source: '3', target: '5' },
    { id: 'e5-6', source: '5', target: '6' },
    { id: 'e3-4', source: '3', target: '4' },
];

export default function App() {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [phoneNumber, setPhoneNumber] = useState('');

    const onConnect = useCallback(
        (params) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const saveData = () => {
        const elements = { nodes, edges };
        axios.post('http://localhost:8081/save', elements)
            .then(response => {
                console.log('Data saved:', response.data);
            })
            .catch(error => {
                console.error('Error saving data:', error);
            });
    };

    const updateNotificationNumber = () => {
        axios.post('http://localhost:8081/updateNotificationNumber', { number: phoneNumber })
            .then(response => {
                console.log('Notification number updated:', response.data);
            })
            .catch(error => {
                console.error('Error updating notification number:', error);
            });
    };

    return (
        <div style={{ width: '100vw', height: '500px' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
            />
            <button onClick={saveData}>Сохранить</button>
            <div style={{ marginTop: '20px' }}>
                <input
                    type="text"
                    placeholder="Введите номер телефона"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                />
                <button onClick={updateNotificationNumber}>Обновить номер для уведомлений</button>
            </div>
        </div>
    );
}
