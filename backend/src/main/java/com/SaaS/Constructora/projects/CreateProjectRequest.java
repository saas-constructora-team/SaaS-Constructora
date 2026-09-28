package com.SaaS.Constructora.projects;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateProjectRequest(
    @NotBlank(message = "El nombre del proyecto es obligatorio")
    @Size(max = 200) String name,
    @Size(max = 200) String clientName,
    @Size(max = 300) String location
) { }