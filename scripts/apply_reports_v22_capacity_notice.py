from pathlib import Path

PATH = Path('src/components/reports/ExecutiveReportPaperV17.tsx')
text = PATH.read_text()

def replace_once(old: str, new: str, label: str):
    global text
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 match, found {count}')
    text = text.replace(old, new, 1)

replace_once(
    "import { formatHoursV14, reportKpisV14, type DeliveryPerformanceRow } from '../../lib/reportV14';\n",
    "import { formatHoursV14, reportKpisV14, type DeliveryPerformanceRow } from '../../lib/reportV14';\nimport { capacitySignalV15 } from '../../lib/reportV15';\n",
    'capacity import',
)

replace_once(
    "  const hours = groupHours(snapshot), usedWidth = contractedMinutes ? Math.min(100, (usedMinutes / contractedMinutes) * 100) : 0, upgrade = upgradeRecommendation(snapshot, contractedMinutes, usedMinutes);\n",
    "  const hours = groupHours(snapshot), usedWidth = contractedMinutes ? Math.min(100, (usedMinutes / contractedMinutes) * 100) : 0, capacitySignal = capacitySignalV15(snapshot), firstCapacityNotice = capacitySignal.state === 'first_over' ? capacitySignal.message : '', upgrade = upgradeRecommendation(snapshot, contractedMinutes, usedMinutes);\n",
    'capacity calculation',
)

old = "{manualMinutes > 0 ? <p className=\"reports-v21-manual-note\"><span className=\"reports-v21-manual-tag\">Manual</span><strong>{formatHoursV14(manualMinutes)}</strong> complementados neste fechamento por não terem sido registrados no Workspace a tempo.</p> : null}{contractedMinutes ? <p className=\"reports-v19-note\"><strong>Como funciona a disponibilidade:</strong> conforme contrato, as {kpis.contractedHours}h representam a capacidade reservada para o mês. O uso pode variar e não há obrigação de consumir toda a carga. Horas não utilizadas não são cumulativas nem transferidas para o período seguinte.</p> : null}{upgrade ? <p className=\"reports-v19-note upgrade\"><strong>Recomendação de capacidade:</strong> {upgrade}</p> : null}"
new = "{manualMinutes > 0 ? <p className=\"reports-v21-manual-note\"><span className=\"reports-v21-manual-tag\">Manual</span><strong>{formatHoursV14(manualMinutes)}</strong> complementados neste fechamento por não terem sido registrados no Workspace a tempo.</p> : null}{firstCapacityNotice ? <p className=\"reports-v19-note capacity-alert\"><strong>Atenção à capacidade:</strong> {firstCapacityNotice}</p> : null}{contractedMinutes ? <p className=\"reports-v19-note\"><strong>Como funciona a disponibilidade:</strong> conforme contrato, as {kpis.contractedHours}h representam a capacidade reservada para o mês. O uso pode variar e não há obrigação de consumir toda a carga. Horas não utilizadas não são cumulativas nem transferidas para o período seguinte.</p> : null}{upgrade ? <p className=\"reports-v19-note upgrade\"><strong>Recomendação de capacidade:</strong> {upgrade}</p> : null}"
replace_once(old, new, 'capacity notice render')

PATH.write_text(text)
