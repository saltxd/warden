import React, { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown, File, Folder, Download, X } from 'lucide-react'
import { API_URL } from '../config'

interface FileNode {
  path: string
  name: string
  extension: string | null
}

interface FileBrowserProps {
  jobId: string
  onClose: () => void
}

export function FileBrowser({ jobId, onClose }: FileBrowserProps) {
  const [files, setFiles] = useState<FileNode[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [fileLanguage, setFileLanguage] = useState<string>('text')
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch(`${API_URL}/jobs/${jobId}/files`)
      .then((res) => res.json())
      .then((data) => {
        setFiles(data.files || [])
        setLoading(false)
        // Auto-expand first level
        const firstLevel = new Set<string>()
        data.files?.forEach((f: FileNode) => {
          const parts = f.path.split('/')
          if (parts.length > 1) {
            firstLevel.add(parts[0])
          }
        })
        setExpandedDirs(firstLevel)
      })
      .catch(() => setLoading(false))
  }, [jobId])

  const loadFile = async (path: string) => {
    setSelectedFile(path)
    setFileContent('Loading...')
    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}/files/${encodeURIComponent(path)}`)
      const data = await res.json()
      setFileContent(data.content)
      setFileLanguage(data.language)
    } catch {
      setFileContent('Error loading file')
    }
  }

  const downloadZip = () => {
    window.open(`${API_URL}/jobs/${jobId}/download`, '_blank')
  }

  // Build tree structure from flat file list
  const buildTree = (files: FileNode[]) => {
    const tree: Record<string, unknown> = {}

    files.forEach((file) => {
      const parts = file.path.split('/')
      let current = tree as Record<string, unknown>

      parts.forEach((part, idx) => {
        if (idx === parts.length - 1) {
          current[part] = { _file: file }
        } else {
          current[part] = current[part] || {}
          current = current[part] as Record<string, unknown>
        }
      })
    })

    return tree
  }

  const toggleDir = (path: string) => {
    const newExpanded = new Set(expandedDirs)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedDirs(newExpanded)
  }

  const renderTree = (node: Record<string, unknown>, path = '', depth = 0): React.ReactElement[] => {
    return Object.entries(node).map(([key, value]) => {
      const currentPath = path ? `${path}/${key}` : key
      const nodeValue = value as Record<string, unknown>

      if (nodeValue._file) {
        // It's a file
        const file = nodeValue._file as FileNode
        return (
          <div
            key={currentPath}
            className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-white/5 rounded ${
              selectedFile === file.path ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-300'
            }`}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
            onClick={() => loadFile(file.path)}
          >
            <File size={14} />
            <span className="text-sm truncate">{key}</span>
          </div>
        )
      } else {
        // It's a directory
        const isExpanded = expandedDirs.has(currentPath)
        return (
          <div key={currentPath}>
            <div
              className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-white/5 rounded text-gray-400"
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
              onClick={() => toggleDir(currentPath)}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Folder size={14} className="text-yellow-500" />
              <span className="text-sm">{key}</span>
            </div>
            {isExpanded && renderTree(nodeValue as Record<string, unknown>, currentPath, depth + 1)}
          </div>
        )
      }
    })
  }

  const tree = buildTree(files)

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-xl border border-white/10 w-full max-w-6xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white">Project Files</h2>
            <span className="text-sm text-gray-500">{files.length} files</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadZip}
              className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition text-sm"
            >
              <Download size={14} />
              Download ZIP
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition">
              <X size={18} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* File tree */}
          <div className="w-64 border-r border-white/10 overflow-y-auto p-2">
            {loading ? (
              <div className="text-gray-500 text-sm p-2">Loading...</div>
            ) : files.length === 0 ? (
              <div className="text-gray-500 text-sm p-2">No files found</div>
            ) : (
              renderTree(tree)
            )}
          </div>

          {/* File content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {selectedFile ? (
              <>
                <div className="px-4 py-2 border-b border-white/10 text-sm text-gray-400 flex items-center justify-between">
                  <span>{selectedFile}</span>
                  <span className="text-xs px-2 py-0.5 bg-white/10 rounded">{fileLanguage}</span>
                </div>
                <pre className="flex-1 overflow-auto p-4 text-sm text-gray-300 font-mono whitespace-pre-wrap">
                  {fileContent}
                </pre>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a file to view its contents
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
