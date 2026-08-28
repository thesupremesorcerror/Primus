package com.primus.core.knowledge;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/kb")
public class KnowledgeBaseController {

    private final KnowledgeBaseService knowledgeBaseService;

    public KnowledgeBaseController(KnowledgeBaseService knowledgeBaseService) {
        this.knowledgeBaseService = knowledgeBaseService;
    }

    @PostMapping("/documents")
    public KbDocument addDocument(@RequestBody AddDocumentRequest request) {
        return knowledgeBaseService.addDocument(request.docType(), request.title(), request.content());
    }

    public record AddDocumentRequest(String docType, String title, String content) {
    }
}
