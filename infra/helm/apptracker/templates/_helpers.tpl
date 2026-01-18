{{/*
Expand the name of the chart.
*/}}
{{- define "apptracker.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "apptracker.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "apptracker.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "apptracker.labels" -}}
helm.sh/chart: {{ include "apptracker.chart" . }}
{{ include "apptracker.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "apptracker.selectorLabels" -}}
app.kubernetes.io/name: {{ include "apptracker.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Server labels
*/}}
{{- define "apptracker.server.labels" -}}
{{ include "apptracker.labels" . }}
app.kubernetes.io/component: server
{{- end }}

{{/*
Server selector labels
*/}}
{{- define "apptracker.server.selectorLabels" -}}
{{ include "apptracker.selectorLabels" . }}
app.kubernetes.io/component: server
{{- end }}

{{/*
UI labels
*/}}
{{- define "apptracker.ui.labels" -}}
{{ include "apptracker.labels" . }}
app.kubernetes.io/component: ui
{{- end }}

{{/*
UI selector labels
*/}}
{{- define "apptracker.ui.selectorLabels" -}}
{{ include "apptracker.selectorLabels" . }}
app.kubernetes.io/component: ui
{{- end }}

{{/*
Agent labels
*/}}
{{- define "apptracker.agent.labels" -}}
{{ include "apptracker.labels" . }}
app.kubernetes.io/component: agent
{{- end }}

{{/*
Agent selector labels
*/}}
{{- define "apptracker.agent.selectorLabels" -}}
{{ include "apptracker.selectorLabels" . }}
app.kubernetes.io/component: agent
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "apptracker.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "apptracker.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Image pull secrets
*/}}
{{- define "apptracker.imagePullSecrets" -}}
{{- with .Values.global.imagePullSecrets }}
imagePullSecrets:
{{- toYaml . | nindent 2 }}
{{- end }}
{{- end }}

{{/*
Server image
*/}}
{{- define "apptracker.server.image" -}}
{{ .Values.global.imageRegistry }}/{{ .Values.server.image.repository }}:{{ .Values.server.image.tag | default .Chart.AppVersion }}
{{- end }}

{{/*
UI image
*/}}
{{- define "apptracker.ui.image" -}}
{{ .Values.global.imageRegistry }}/{{ .Values.ui.image.repository }}:{{ .Values.ui.image.tag | default .Chart.AppVersion }}
{{- end }}

{{/*
Agent image
*/}}
{{- define "apptracker.agent.image" -}}
{{ .Values.global.imageRegistry }}/{{ .Values.agent.image.repository }}:{{ .Values.agent.image.tag | default .Chart.AppVersion }}
{{- end }}
