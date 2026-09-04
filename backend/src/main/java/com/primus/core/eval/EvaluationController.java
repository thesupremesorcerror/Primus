package com.primus.core.eval;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/eval")
public class EvaluationController {

    private final EvaluationService evaluationService;

    public EvaluationController(EvaluationService evaluationService) {
        this.evaluationService = evaluationService;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/run")
    public List<EvalSummary> runEvaluation() {
        return evaluationService.runFullEvaluation();
    }
}