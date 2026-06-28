import { useState } from 'react'
import type { GameRecord } from '../domain/types'

type Props = {
  onlineRecords: GameRecord[]
  localRecords: GameRecord[]
  cloudUnavailable?: boolean
  onClearLocal: () => void
  onClose: () => void
}

function formatRecordTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function RankingModal({ onlineRecords, localRecords, cloudUnavailable = false, onClearLocal, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'online' | 'local'>('online')
  const records = activeTab === 'online' ? onlineRecords : localRecords

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal ranking-modal" role="dialog" aria-modal="true" aria-labelledby="ranking-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-title-row">
          <div>
            <p className="eyebrow">{activeTab === 'online' ? '云端前十名' : '本机前十名'}</p>
            <h2 id="ranking-title">高分排行榜</h2>
          </div>
          <button className="close-button" onClick={onClose} aria-label="关闭排行榜">×</button>
        </div>
        <div className="ranking-tabs" role="tablist" aria-label="排行榜类型">
          <button
            role="tab"
            aria-selected={activeTab === 'online'}
            className={activeTab === 'online' ? 'is-active' : ''}
            onClick={() => setActiveTab('online')}
          >
            在线排行榜
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'local'}
            className={activeTab === 'local' ? 'is-active' : ''}
            onClick={() => setActiveTab('local')}
          >
            本机排行榜
          </button>
        </div>
        {cloudUnavailable && activeTab === 'online' ? <p className="ranking-warning">在线排行榜暂时不可用。</p> : null}
        {activeTab === 'local' ? (
          <div className="local-ranking-actions">
            <p>本机排行榜只统计当前浏览器保存的成绩。</p>
            <button onClick={onClearLocal} disabled={localRecords.length === 0}>清零本机排行</button>
          </div>
        ) : null}
        {records.length === 0 ? (
          <p className="empty-ranking">完成第一局后，成绩会出现在这里。</p>
        ) : (
          <div className="ranking-list">
            <div className="ranking-row ranking-heading">
              <span>名次</span><span>玩家</span><span>分数</span><span>拿到成绩时间</span>
            </div>
            {records.map((record, index) => (
              <div className="ranking-row" key={record.id}>
                <strong>{index + 1}</strong>
                <span>{record.username}{record.failed ? <small>挑战失败</small> : null}</span>
                <strong>{record.score}</strong>
                <span>{formatRecordTime(record.completedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
