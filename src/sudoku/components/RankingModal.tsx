import type { GameRecord } from '../domain/types'

type Props = {
  records: GameRecord[]
  cloudUnavailable?: boolean
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

export function RankingModal({ records, cloudUnavailable = false, onClose }: Props) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal ranking-modal" role="dialog" aria-modal="true" aria-labelledby="ranking-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-title-row">
          <div>
            <p className="eyebrow">{cloudUnavailable ? '本机备份前十名' : '云端前十名'}</p>
            <h2 id="ranking-title">高分排行榜</h2>
          </div>
          <button className="close-button" onClick={onClose} aria-label="关闭排行榜">×</button>
        </div>
        {cloudUnavailable ? <p className="ranking-warning">云端排行榜暂时不可用，当前显示本机备份成绩。</p> : null}
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
