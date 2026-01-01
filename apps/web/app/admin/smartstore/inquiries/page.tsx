'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReplyIcon from '@mui/icons-material/Reply';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDateShort } from '@/lib/utils/formatters';

// =============================================================================
// Types
// =============================================================================

interface Inquiry {
  inquiryId: string;
  productId: string;
  productName: string;
  inquiryType: string;
  title: string;
  content: string;
  createdDate: string;
  answeredDate?: string;
  isAnswered: boolean;
  inquirer: {
    name: string;
    memberId: string;
  };
  linkedOrder?: {
    id: string;
    externalOrderId: string;
    status: string;
    customerEmail: string;
    amount: number;
  };
}

interface Template {
  id: string;
  title: string;
  category: string;
  content: string;
  variables: string[] | null;
  is_active: boolean;
  sort_order: number;
}

// =============================================================================
// Helpers
// =============================================================================

function formatInquiryType(type: string): string {
  const typeMap: Record<string, string> = {
    PRODUCT: '상품 문의',
    DELIVERY: '배송 문의',
    EXCHANGE_RETURN: '교환/반품',
    OTHER: '기타',
  };
  return typeMap[type] || type;
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    delivery: '배송',
    installation: '설치',
    refund: '환불',
    product: '상품',
    general: '일반',
  };
  return labels[category] || category;
}

// =============================================================================
// Main Component
// =============================================================================

export default function SmartStoreInquiriesPage() {
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = React.useState(0);
  const [selectedInquiry, setSelectedInquiry] = React.useState<Inquiry | null>(null);
  const [replyDialogOpen, setReplyDialogOpen] = React.useState(false);
  const [replyContent, setReplyContent] = React.useState('');
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('');

  // Template management state
  const [templateDialogOpen, setTemplateDialogOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<Template | null>(null);
  const [templateForm, setTemplateForm] = React.useState({
    title: '',
    category: 'general' as string,
    content: '',
  });

  // Fetch inquiries
  const { data: inquiriesData, isLoading: inquiriesLoading } = useQuery<{
    success: boolean;
    data: Inquiry[];
  }>({
    queryKey: ['admin', 'smartstore', 'inquiries', tabValue === 0 ? 'unanswered' : 'answered'],
    queryFn: async () => {
      const answered = tabValue === 1 ? 'true' : 'false';
      const res = await fetch(`/api/admin/smartstore/inquiries?answered=${answered}`);
      if (!res.ok) throw new Error('Failed to fetch inquiries');
      return res.json();
    },
  });

  // Fetch templates
  const { data: templatesData, isLoading: templatesLoading } = useQuery<{
    success: boolean;
    data: Template[];
  }>({
    queryKey: ['admin', 'smartstore', 'templates'],
    queryFn: async () => {
      const res = await fetch('/api/admin/smartstore/templates?active=true');
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
  });

  // Fetch all templates (including inactive) for management
  const { data: allTemplatesData } = useQuery<{
    success: boolean;
    data: Template[];
  }>({
    queryKey: ['admin', 'smartstore', 'templates', 'all'],
    queryFn: async () => {
      const res = await fetch('/api/admin/smartstore/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
    enabled: tabValue === 2,
  });

  const inquiries = inquiriesData?.data || [];
  const templates = templatesData?.data || [];
  const allTemplates = allTemplatesData?.data || [];

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async (data: { inquiryId: string; content: string }) => {
      const res = await fetch('/api/admin/smartstore/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to send reply');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'smartstore', 'inquiries'] });
      setReplyDialogOpen(false);
      setSelectedInquiry(null);
      setReplyContent('');
      setSelectedTemplateId('');
    },
  });

  // Template CRUD mutations
  const saveTemplateMutation = useMutation({
    mutationFn: async (data: { id?: string; title: string; category: string; content: string }) => {
      const method = data.id ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/smartstore/templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save template');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'smartstore', 'templates'] });
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      setTemplateForm({ title: '', category: 'general', content: '' });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/smartstore/templates?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete template');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'smartstore', 'templates'] });
    },
  });

  // Handlers
  const handleReplyClick = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setReplyContent('');
    setSelectedTemplateId('');
    setReplyDialogOpen(true);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      let content = template.content;
      // Apply basic variable substitution
      if (selectedInquiry) {
        content = content.replace(/\{\{customerName\}\}/g, selectedInquiry.inquirer.name);
        content = content.replace(/\{\{productName\}\}/g, selectedInquiry.productName);
        if (selectedInquiry.linkedOrder) {
          content = content.replace(/\{\{orderId\}\}/g, selectedInquiry.linkedOrder.externalOrderId);
        }
      }
      setReplyContent(content);
    }
  };

  const handleSendReply = () => {
    if (selectedInquiry && replyContent.trim()) {
      replyMutation.mutate({
        inquiryId: selectedInquiry.inquiryId,
        content: replyContent,
      });
    }
  };

  const handleNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({ title: '', category: 'general', content: '' });
    setTemplateDialogOpen(true);
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setTemplateForm({
      title: template.title,
      category: template.category,
      content: template.content,
    });
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = () => {
    saveTemplateMutation.mutate({
      id: editingTemplate?.id,
      ...templateForm,
    });
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={600}>
          고객 문의 관리
        </Typography>
        <Tooltip title="새로고침">
          <IconButton onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'smartstore'] })}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="미답변" icon={<PendingIcon />} iconPosition="start" />
        <Tab label="답변완료" icon={<CheckCircleIcon />} iconPosition="start" />
        <Tab label="템플릿 관리" />
      </Tabs>

      {replyMutation.isSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          답변이 전송되었습니다
        </Alert>
      )}

      {replyMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          답변 전송에 실패했습니다. 다시 시도해주세요.
        </Alert>
      )}

      {/* Inquiries List (Tab 0 & 1) */}
      {tabValue < 2 && (
        <Card>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>유형</TableCell>
                    <TableCell>상품</TableCell>
                    <TableCell>고객</TableCell>
                    <TableCell>제목</TableCell>
                    <TableCell>날짜</TableCell>
                    <TableCell>주문연결</TableCell>
                    <TableCell align="right">액션</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inquiriesLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(7)].map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : inquiries.length > 0 ? (
                    inquiries.map((inquiry) => (
                      <TableRow key={inquiry.inquiryId} hover>
                        <TableCell>
                          <Chip
                            label={formatInquiryType(inquiry.inquiryType)}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                            {inquiry.productName}
                          </Typography>
                        </TableCell>
                        <TableCell>{inquiry.inquirer.name}</TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                            {inquiry.title}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDateShort(inquiry.createdDate)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {inquiry.linkedOrder ? (
                            <Chip
                              label={inquiry.linkedOrder.externalOrderId}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {!inquiry.isAnswered && (
                            <Button
                              size="small"
                              startIcon={<ReplyIcon />}
                              onClick={() => handleReplyClick(inquiry)}
                            >
                              답변
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary" py={4}>
                          {tabValue === 0 ? '미답변 문의가 없습니다' : '답변 완료된 문의가 없습니다'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Template Management (Tab 2) */}
      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={600}>
                답변 템플릿
              </Typography>
              <Button startIcon={<AddIcon />} onClick={handleNewTemplate}>
                템플릿 추가
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>제목</TableCell>
                    <TableCell>카테고리</TableCell>
                    <TableCell>변수</TableCell>
                    <TableCell>상태</TableCell>
                    <TableCell align="right">액션</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {templatesLoading ? (
                    [...Array(3)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(5)].map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : allTemplates.length > 0 ? (
                    allTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>{template.title}</TableCell>
                        <TableCell>
                          <Chip label={getCategoryLabel(template.category)} size="small" />
                        </TableCell>
                        <TableCell>
                          {template.variables?.map((v) => (
                            <Chip
                              key={v}
                              label={`{{${v}}}`}
                              size="small"
                              variant="outlined"
                              sx={{ mr: 0.5, fontFamily: 'monospace', fontSize: '0.75rem' }}
                            />
                          )) || '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={template.is_active ? '활성' : '비활성'}
                            size="small"
                            color={template.is_active ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => handleEditTemplate(template)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary" py={4}>
                          등록된 템플릿이 없습니다
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onClose={() => setReplyDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>문의 답변</DialogTitle>
        <DialogContent>
          {selectedInquiry && (
            <Box>
              <Card variant="outlined" sx={{ mb: 3, bgcolor: 'action.hover' }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        고객
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {selectedInquiry.inquirer.name}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant="caption" color="text.secondary">
                        상품
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {selectedInquiry.productName}
                      </Typography>
                    </Grid>
                    {selectedInquiry.linkedOrder && (
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" color="text.secondary">
                          연결된 주문
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {selectedInquiry.linkedOrder.externalOrderId} ({selectedInquiry.linkedOrder.status})
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" fontWeight={600}>
                    {selectedInquiry.title}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                    {selectedInquiry.content}
                  </Typography>
                </CardContent>
              </Card>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>템플릿 선택</InputLabel>
                <Select
                  label="템플릿 선택"
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                >
                  <MenuItem value="">직접 작성</MenuItem>
                  {templates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      [{getCategoryLabel(template.category)}] {template.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="답변 내용"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                multiline
                rows={6}
                fullWidth
                placeholder="고객님께 전달할 답변을 작성해주세요..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReplyDialogOpen(false)}>취소</Button>
          <Button
            variant="contained"
            onClick={handleSendReply}
            disabled={replyMutation.isPending || !replyContent.trim()}
            startIcon={<ReplyIcon />}
          >
            {replyMutation.isPending ? '전송 중...' : '답변 전송'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTemplate ? '템플릿 수정' : '템플릿 추가'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="제목"
              value={templateForm.title}
              onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>카테고리</InputLabel>
              <Select
                label="카테고리"
                value={templateForm.category}
                onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
              >
                <MenuItem value="delivery">배송</MenuItem>
                <MenuItem value="installation">설치</MenuItem>
                <MenuItem value="refund">환불</MenuItem>
                <MenuItem value="product">상품</MenuItem>
                <MenuItem value="general">일반</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="내용"
              value={templateForm.content}
              onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
              multiline
              rows={6}
              fullWidth
              required
              helperText="변수 사용: {{customerName}}, {{productName}}, {{orderId}}"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>취소</Button>
          <Button
            variant="contained"
            onClick={handleSaveTemplate}
            disabled={saveTemplateMutation.isPending || !templateForm.title || !templateForm.content}
          >
            {saveTemplateMutation.isPending ? '저장 중...' : '저장'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
