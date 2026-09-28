export interface Project {
  id: string;
  name: string;
  clientName: string;
  location: string;
  status: string;
  createdAt: string;
}

export interface CreateProjectRequest {
  name: string;
  clientName: string;
  location: string;
}